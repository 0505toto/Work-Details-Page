/**
 * 業務ポータルページ 機能実装スクリプト
 * - アコーディオン（開閉）機能
 * - タイトル編集機能
 * - ドラッグ＆ドロップによる並び替え機能
 * - 上記の変更内容をlocalStorageに保存・復元する機能
 */

// DOM（HTMLの要素）の読み込みが完了したら、中の処理を実行する
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 要素の取得と初期設定 ---

    const portalGrid = document.getElementById('portal-grid');
    const sections = document.querySelectorAll('.portal-section');

    // 各セクションにユニークなIDを割り振る（保存・復元時にどのセクションかを識別するため）
    sections.forEach((section, index) => {
        // もし既にIDがあれば何もしない
        if (!section.dataset.id) {
            section.dataset.id = `section-${index}`;
        }
    });

    // --- 2. 機能の初期化 ---

    // ページ読み込み時に、保存された状態（並び順やタイトル）を復元する
    loadState();

    // 各セクションにイベントリスナー（操作を監視する仕組み）を設定する
    document.querySelectorAll('.portal-section').forEach(section => {
        setupAccordion(section);
        setupTitleEditing(section);
        setupDragAndDrop(section);
    });

    // --- 3. 各機能のセットアップ関数 ---

    /**
     * アコーディオン機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupAccordion(section) {
        const header = section.querySelector('.section-header');
        const toggleButton = section.querySelector('.toggle-button');

        header.addEventListener('click', (e) => {
            // タイトル自体をクリックした場合は、編集モードになるのでアコーディオンは開閉しない
            if (e.target.classList.contains('section-title')) {
                return;
            }
            // is-openクラスを付けたり外したりすることで、CSS側で設定したアニメーションが実行される
            section.classList.toggle('is-open');
        });
    }

    /**
     * タイトル編集機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupTitleEditing(section) {
        const title = section.querySelector('.section-title');
        // 'blur'は、要素からフォーカスが外れた時（編集が終わって他の場所をクリックした時）に発生するイベント
        title.addEventListener('blur', saveState);
    }

    /**
     * ドラッグ＆ドロップ機能の設定
     * @param {HTMLElement} section 対象のセクション要素
     */
    function setupDragAndDrop(section) {
        // ドラッグが開始された時のイベント
        section.addEventListener('dragstart', () => {
            // ドラッグ中の要素に 'dragging' クラスを追加して、見た目を変える（CSSで設定）
            section.classList.add('dragging');
        });

        // ドラッグが終了した時のイベント
        section.addEventListener('dragend', () => {
            // 'dragging' クラスを削除して、見た目を元に戻す
            section.classList.remove('dragging');
        });
    }

    // ドラッグ要素が他の要素の上にある時のイベント
    portalGrid.addEventListener('dragover', e => {
        e.preventDefault(); // デフォルトの動作をキャンセルして、ドロップを許可する
        const draggingItem = document.querySelector('.dragging');
        // ドロップ先の要素を取得
        const afterElement = getDragAfterElement(portalGrid, e.clientY);

        if (afterElement == null) {
            portalGrid.appendChild(draggingItem);
        } else {
            portalGrid.insertBefore(draggingItem, afterElement);
        }
    });
    
    // ドロップした時のイベント
    portalGrid.addEventListener('drop', e => {
        e.preventDefault();
        // ドロップが完了したら、現在の並び順とタイトルを保存する
        saveState();
    });


    // --- 4. ヘルパー関数と状態管理 ---

    /**
     * ドラッグ中のマウスカーソルのY座標から、どの要素の次に挿入するかを判断する
     * @param {HTMLElement} container ドラッグ＆ドロップが行われるコンテナ要素
     * @param {number} y マウスのY座標
     * @returns {HTMLElement|null} 挿入先の要素。末尾の場合はnullを返す
     */
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.portal-section:not(.dragging)')];

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

    /**
     * 現在のポータルの状態（並び順とタイトル）をlocalStorageに保存する
     */
    function saveState() {
        const state = {
            order: [],
            titles: {}
        };

        // 現在のセクションの並び順とタイトルを取得してstateオブジェクトに格納
        document.querySelectorAll('.portal-section').forEach(section => {
            const id = section.dataset.id;
            const title = section.querySelector('.section-title').textContent;
            state.order.push(id);
            state.titles[id] = title;
        });

        // JSON形式の文字列に変換してlocalStorageに保存
        localStorage.setItem('businessPortalState', JSON.stringify(state));
    }

    /**
     * localStorageから状態を読み込み、ページに反映させる
     */
    function loadState() {
        const savedStateJSON = localStorage.getItem('businessPortalState');
        if (!savedStateJSON) return; // 保存されたデータがなければ何もしない

        const savedState = JSON.parse(savedStateJSON);

        // 保存されたタイトルを各セクションに適用
        if (savedState.titles) {
            for (const id in savedState.titles) {
                const section = document.querySelector(`.portal-section[data-id="${id}"]`);
                if (section) {
                    section.querySelector('.section-title').textContent = savedState.titles[id];
                }
            }
        }
        
        // 保存された並び順にセクションを並び替える
        if (savedState.order && savedState.order.length > 0) {
            const currentSections = new Map();
            document.querySelectorAll('.portal-section').forEach(section => {
                currentSections.set(section.dataset.id, section);
            });

            // 一旦コンテナを空にする
            portalGrid.innerHTML = ''; 

            // 保存された順序で要素をコンテナに追加し直す
            savedState.order.forEach(id => {
                const section = currentSections.get(id);
                if (section) {
                    portalGrid.appendChild(section);
                }
            });
        }
    }
});
