/**
 * 業務ポータルページ 機能実装スクリプト
 * - ユーザーアイコンのクリックアニメーション
 * - ピックアップ表示機能
 * - タイトル編集機能
 * - ドラッグ＆ドロップによる並び替え機能
 * - 状態のlocalStorageへの保存・復元機能
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 要素の取得 ---
    const portalGrid = document.getElementById('portal-grid');
    const overlay = document.getElementById('overlay');
    const userIconContainer = document.querySelector('.user-icon-container');
    const zoomEffectEl = document.getElementById('icon-zoom-effect');
    let placeholder = null;

    // --- 2. 機能の初期化 ---
    loadState();
    setupUserIconAnimation();

    document.querySelectorAll('.portal-section').forEach(section => {
        setupSection(section);
    });

    // --- 3. 各機能のセットアップ関数 ---

    /**
     * ユーザーアイコンのクリックアニメーション設定
     */
    function setupUserIconAnimation() {
        if (!userIconContainer || !zoomEffectEl) return;

        userIconContainer.addEventListener('click', (e) => {
            // アニメーション中はクリックを無視
            if (zoomEffectEl.classList.contains('is-animating')) {
                return;
            }
            
            const icon = e.currentTarget.querySelector('.user-icon');
            const rect = icon.getBoundingClientRect(); // アイコンの位置とサイズを取得

            // アニメーション要素の初期スタイルを設定
            zoomEffectEl.style.left = `${rect.left}px`;
            zoomEffectEl.style.top = `${rect.top}px`;
            zoomEffectEl.style.width = `${rect.width}px`;
            zoomEffectEl.style.height = `${rect.height}px`;
            zoomEffectEl.style.backgroundImage = `url(${icon.src})`;
            
            // アニメーションを開始
            zoomEffectEl.classList.add('is-animating');

            // アニメーション終了後にクラスを削除
            zoomEffectEl.addEventListener('animationend', () => {
                zoomEffectEl.classList.remove('is-animating');
            }, { once: true }); // イベントリスナーを一度だけ実行して自動で削除
        });
    }

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
            if (e.target.isContentEditable) return;
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
            section.classList.remove('is-picked-up');
            overlay.classList.remove('is-active');
            if (placeholder) {
                placeholder.replaceWith(section);
                placeholder = null;
            }
            section.setAttribute('draggable', 'true');
        } else {
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
        title.addEventListener('blur', saveState);
    }

    /**
     * ドラッグ＆ドロップ機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupDragAndDrop(section) {
        section.addEventListener('dragstart', () => {
            if (section.classList.contains('is-picked-up')) return;
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
            saveState();
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
        const state = { order: [], titles: {} };
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
