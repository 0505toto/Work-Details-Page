/**
 * 業務ポータルページ 機能実装スクリプト
 * - ピックアップ表示機能
 * - タイトル編集機能
 * - ドラッグ＆ドロップによる並び替え機能
 * - 状態のlocalStorageへの保存・復元機能
 * - tsParticlesによる背景アニメーション
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 要素の取得 ---
    const portalGrid = document.getElementById('portal-grid');
    const overlay = document.getElementById('overlay');
    let placeholder = null; // ピックアップ時のプレースホルダー要素

    // --- 2. 機能の初期化 ---
    initializeParticles();
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
            
            // プレースホルダーを元の要素に戻す
            if (placeholder) {
                placeholder.replaceWith(section);
                placeholder = null;
            }
            // ドラッグ可能に戻す
            section.setAttribute('draggable', 'true');

        } else {
            // --- ピックアップを実行 ---
            // プレースホルダーを作成して元の位置に挿入
            placeholder = document.createElement('div');
            placeholder.className = 'placeholder';
            placeholder.style.height = `${section.offsetHeight}px`;
            section.after(placeholder);

            section.classList.add('is-picked-up');
            overlay.classList.add('is-active');
            portalGrid.appendChild(section); // DOMの構造上、gridの最後に移動してfixed配置
            
            // ピックアップ中はドラッグ不可にする
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
            // ピックアップされている要素はドラッグさせない
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
        // is-picked-upではない通常の要素、またはプレースホルダーの位置にあるべき要素の順で保存
        const sectionsOnGrid = portalGrid.querySelectorAll('.portal-section:not(.is-picked-up), .placeholder');
        
        sectionsOnGrid.forEach(el => {
            let id;
            if (el.classList.contains('placeholder')) {
                // プレースホルダーがある場合、ピックアップ中の要素のIDを取得
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
            // 初回訪問時、各セクションにIDを割り振る
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

    // --- 5. 背景アニメーションの初期化 ---
    function initializeParticles() {
        tsParticles.load("tsparticles", {
            fpsLimit: 60,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "grab",
                    },
                    resize: true,
                },
                modes: {
                    grab: {
                        distance: 140,
                        links: {
                            opacity: 1,
                        },
                    },
                },
            },
            particles: {
                color: {
                    value: "#008374", // Primary green color
                },
                links: {
                    color: "#008374",
                    distance: 150,
                    enable: true,
                    opacity: 0.5,
                    width: 1,
                },
                collisions: {
                    enable: true,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: false,
                    speed: 1,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                        area: 800,
                    },
                    value: 80,
                },
                opacity: {
                    value: 0.5,
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 5 },
                },
            },
            detectRetina: true,
        });
    }
});
