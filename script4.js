/**
 * 業務ポータルページ 機能実装スクリプト
 * - ピックアップ表示機能
 * - タイトル編集機能
 * - ドラッグ＆ドロップによる並び替え機能
 * - 状態のlocalStorageへの保存・復元機能
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 要素の取得 ---
    const portalGrid = document.getElementById('portal-grid');
    const overlay = document.getElementById('overlay');
    let placeholder = null; // ピックアップ時のプレースホルダー要素

    // --- 2. 機能の初期化 ---
    loadState();

    // 各セクションにイベントリスナーを設定
    // loadStateで並び替えた後に要素を再取得する必要がある
    document.querySelectorAll('.portal-section').forEach(section => {
        setupSection(section);
    });

    // --- 3. 各機能のセットアップ関数 ---

    /**
     * 各セクションに必要なイベントリスナーをまとめて設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupSection(section) {
        setupPickup(section);
        setupTitleEditing(section);
        setupDragAndDrop(section);
    }

    /**
     * ピックアップ表示機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupPickup(section) {
        const header = section.querySelector('.section-header');
        header.addEventListener('click', (e) => {
            // タイトル編集中はピックアップしない
            if (e.target.isContentEditable) {
                return;
            }
            togglePickup(section);
        });
    }

    /**
     * ピックアップ表示をトグルする
     * @param {HTMLElement} section 対象のセクション要素
     */
    function togglePickup(section) {
        const isPickedUp = section.classList.contains('is-picked-up');

        if (isPickedUp) {
            // --- ピックアップを解除 ---
            section.classList.remove('is-picked-up');
            overlay.classList.remove('is-active');
            
            if (placeholder) {
                placeholder.replaceWith(section);
                placeholder = null;
            }
            section.setAttribute('draggable', 'true');

        } else {
            // --- ピックアップを実行 ---
            placeholder = document.createElement('div');
            placeholder.className = 'placeholder';
            placeholder.style.height = `${section.offsetHeight}px`;
            section.after(placeholder);

            section.classList.add('is-picked-up');
            overlay.classList.add('is-active');
            
            document.body.appendChild(section); 
            
            section.setAttribute('draggable', 'false');
        }
    }
    
    // オーバーレイクリックでピックアップを解除
    overlay.addEventListener('click', () => {
        const pickedUpElement = document.querySelector('.portal-section.is-picked-up');
        if (pickedUpElement) {
            togglePickup(pickedUpElement);
        }
    });


    /**
     * タイトル編集機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupTitleEditing(section) {
        const title = section.querySelector('.section-title');
        title.addEventListener('blur', saveState); // フォーカスが外れたら保存
    }

    /**
     * ドラッグ＆ドロップ機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupDragAndDrop(section) {
        section.addEventListener('dragstart', () => {
            if(section.classList.contains('is-picked-up')) return;
            section.classList.add('dragging');
        });

        section.addEventListener('dragend', () => {
            section.classList.remove('dragging');
        });
    }

    portalGrid.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const afterElement = getDragAfterElement(portalGrid, e.clientY);
        if (afterElement == null) {
            portalGrid.appendChild(draggingItem);
        } else {
            portalGrid.insertBefore(draggingItem, afterElement);
        }
    });

    portalGrid.addEventListener('drop', e => {
        e.preventDefault();
        if (document.querySelector('.dragging')) {
            saveState(); // ドロップ完了時に状態を保存
        }
    });


    // --- 4. ヘルパー関数と状態管理 ---

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.portal-section:not(.dragging):not(.is-picked-up)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function saveState() {
        const state = {
            order: [],
            titles: {}
        };
        const sectionsOnGrid = portalGrid.querySelectorAll('.portal-section:not(.is-picked-up), .placeholder');
        
        sectionsOnGrid.forEach(el => {
            let id;
            if (el.classList.contains('placeholder')) {
                const pickedUp = document.querySelector('.is-picked-up');
                if (pickedUp) id = pickedUp.dataset.id;
            } else {
                id = el.dataset.id;
            }

            if (id) {
                const originalSection = document.querySelector(`.portal-section[data-id="${id}"]`);
                const title = originalSection.querySelector('.section-title').textContent;
                state.order.push(id);
                state.titles[id] = title;
            }
        });

        localStorage.setItem('businessPortalState', JSON.stringify(state));
    }

    function loadState() {
        const savedStateJSON = localStorage.getItem('businessPortalState');
        if (!savedStateJSON) {
            document.querySelectorAll('.portal-section').forEach((section, index) => {
                if (!section.dataset.id) section.dataset.id = `section-${index}`;
            });
            return;
        }

        const savedState = JSON.parse(savedStateJSON);

        if (savedState.titles) {
            for (const id in savedState.titles) {
                const section = document.querySelector(`.portal-section[data-id="${id}"]`);
                if (section) {
                    section.querySelector('.section-title').textContent = savedState.titles[id];
                }
            }
        }

        if (savedState.order && savedState.order.length > 0) {
            const currentSections = new Map();
            document.querySelectorAll('.portal-section').forEach(section => {
                currentSections.set(section.dataset.id, section);
            });
            portalGrid.innerHTML = '';
            savedState.order.forEach(id => {
                const section = currentSections.get(id);
                if (section) {
                    portalGrid.appendChild(section);
                }
            });
        }
    }
});
