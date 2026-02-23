// 主要应用逻辑
// 注意：初始化现在由 js/app.js 中的 UnifiedApp 控制

class SplitPicApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.currentFile = null;
        this.cuttingResults = [];
        this.selectedItems = new Set();
        this.isActive = false;

        // DOM元素引用
        this.elements = {};

        // 绑定方法
        this.init = this.init.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleProcess = this.handleProcess.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleSelectAll = this.handleSelectAll.bind(this);
        this.handleDownloadSelected = this.handleDownloadSelected.bind(this);
        this.handleDownloadAll = this.handleDownloadAll.bind(this);

        // 自动初始化
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.initElements();
        this.bindEvents();
        this.checkBrowserSupport();

        // 添加处理状态标志
        this.isProcessing = false;

        // 验证关键元素是否正确获取
        this.validateElements();

        // 标记为激活
        this.isActive = true;
    }

    /**
     * 激活应用
     */
    activate() {
        if (!this.isActive) {
            this.isActive = true;
            console.log('切割应用已激活');
        }
    }

    /**
     * 停用应用
     */
    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            console.log('切割应用已停用');
        }
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        this.elements = {
            // 上传相关
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            uploadBtn: document.getElementById('uploadBtn'),

            // 控制面板
            uploadSection: document.getElementById('split-uploadSection'),
            controlSection: document.getElementById('controlSection'),
            rowsInput: document.getElementById('rowsInput'),
            colsInput: document.getElementById('colsInput'),
            formatSelect: document.getElementById('formatSelect'),
            qualitySelect: document.getElementById('qualitySelect'),
            autoTrimCheckbox: document.getElementById('autoTrimCheckbox'),
            processBtn: document.getElementById('processBtn'),
            resetBtn: document.getElementById('resetBtn'),

            // 预览和结果
            originalPreviewSection: document.getElementById('originalPreviewSection'),
            originalImage: document.getElementById('originalImage'),
            imageDimensions: document.getElementById('imageDimensions'),
            imageSize: document.getElementById('imageSize'),
            resultSection: document.getElementById('resultSection'),
            cuttingGrid: document.getElementById('cuttingGrid'),

            // 操作按钮
            selectAllBtn: document.getElementById('selectAllBtn'),
            downloadSelectedBtn: document.getElementById('downloadSelectedBtn'),
            downloadAllBtn: document.getElementById('downloadAllBtn'),

            // 加载状态
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    /**
     * 验证关键DOM元素是否正确获取
     */
    validateElements() {
        const criticalElements = ['uploadArea', 'uploadBtn', 'fileInput'];
        let missingElements = [];

        criticalElements.forEach(elementName => {
            if (!this.elements[elementName]) {
                missingElements.push(elementName);
                console.error(`关键元素缺失: ${elementName}`);
            }
        });

        // 检查预览元素
        const previewElements = ['originalImage', 'imageDimensions', 'imageSize'];
        previewElements.forEach(elementName => {
            if (!this.elements[elementName]) {
                console.warn(`预览元素缺失: ${elementName}`);
            }
        });

        if (missingElements.length > 0) {
            console.error('缺失的关键元素:', missingElements);
            showError('应用初始化失败：页面元素加载不完整，请刷新页面重试');
        } else {
            console.log('所有关键元素验证通过');
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 为上传按钮添加独立事件监听器（主要方式）
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.triggerFileInput();
            });
        }

        // 为上传区域添加点击事件（辅助方式，支持拖拽后点击）
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', (e) => {
                // 只有点击上传区域本身时才触发
                if (e.target === this.elements.uploadArea || e.target.closest('.upload-content')) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('上传区域被点击');
                    this.triggerFileInput();
                }
            });
        }

        // 文件选择事件 - 添加防重复机制
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                console.log('文件选择事件触发');
                this.handleFileSelect(e);
            });
        } else {
            console.error('文件输入框未找到');
        }

        // 拖拽上传事件
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('dragover', this.handleDragOver);
            this.elements.uploadArea.addEventListener('dragleave', this.handleDragLeave);
            this.elements.uploadArea.addEventListener('drop', this.handleDrop);
        }

        // 控制按钮事件
        if (this.elements.processBtn) {
            this.elements.processBtn.addEventListener('click', this.handleProcess);
        }
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', this.handleReset);
        }

        // 结果操作事件
        if (this.elements.selectAllBtn) {
            this.elements.selectAllBtn.addEventListener('click', this.handleSelectAll);
        }
        if (this.elements.downloadSelectedBtn) {
            this.elements.downloadSelectedBtn.addEventListener('click', this.handleDownloadSelected);
        }
        if (this.elements.downloadAllBtn) {
            this.elements.downloadAllBtn.addEventListener('click', this.handleDownloadAll);
        }

        // 移动端触摸事件支持
        this.addMobileSupport();

        // 防止页面默认拖拽行为
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    /**
     * 检查浏览器支持
     */
    checkBrowserSupport() {
        const support = checkBrowserSupport();

        if (!support.canvas) {
            showError('您的浏览器不支持Canvas，无法使用此功能');
            return;
        }

        if (!support.fileApi) {
            showError('您的浏览器不支持File API，无法使用此功能');
            return;
        }

        if (!support.dragDrop) {
            console.warn('浏览器不支持拖拽功能，将使用按钮上传');
        }
    }

    /**
     * 处理文件选择
     * @param {Event} event - 文件选择事件
     */
    async handleFileSelect(event) {
        // 防止重复处理
        if (this.isProcessing) {
            console.log('文件处理中，忽略重复触发');
            return;
        }

        const files = event.target.files;
        if (files.length === 0) return;

        // 设置处理标志
        this.isProcessing = true;

        try {
            // 只处理第一个文件
            const file = files[0];
            await this.processFile(file);
        } catch (error) {
            console.error('文件处理错误:', error);
            showError('文件处理失败：' + error.message);
        } finally {
            // 重置处理标志和文件输入框
            this.isProcessing = false;
            this.elements.fileInput.value = '';
        }
    }

    /**
     * 处理拖拽悬停
     * @param {Event} event - 拖拽事件
     */
    handleDragOver(event) {
        event.preventDefault();
        this.elements.uploadArea.classList.add('dragover');
    }

    /**
     * 处理拖拽离开
     * @param {Event} event - 拖拽事件
     */
    handleDragLeave(event) {
        event.preventDefault();
        this.elements.uploadArea.classList.remove('dragover');
    }

    /**
     * 安全触发文件输入选择
     */
    triggerFileInput() {
        if (!this.isProcessing) {
            this.elements.fileInput.click();
        }
    }

    /**
     * 添加移动端触摸事件支持
     */
    addMobileSupport() {
        if (!this.elements.uploadArea) {
            return;
        }

        // 触摸开始事件 - 模拟点击
        this.elements.uploadArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.triggerFileInput();
        }, { passive: false });

        // 触摸移动事件 - 防止页面滚动
        this.elements.uploadArea.addEventListener('touchmove', (e) => {
            if (e.target.closest('#uploadArea')) {
                e.preventDefault();
            }
        }, { passive: false });

        // 触摸结束事件 - 清理状态
        this.elements.uploadArea.addEventListener('touchend', (e) => {
            if (e.target.closest('#uploadArea')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * 处理文件拖拽放置
     * @param {Event} event - 拖拽事件
     */
    async handleDrop(event) {
        event.preventDefault();
        this.elements.uploadArea.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        await this.processFile(file);
    }

    /**
     * 处理文件
     * @param {File} file - 文件对象
     */
    async processFile(file) {
        try {
            // 验证文件类型
            if (!isValidImageFile(file)) {
                showError('不支持的图片格式，请选择有效的图片文件');
                return;
            }

            // 验证文件大小 (限制为50MB)
            if (file.size > 50 * 1024 * 1024) {
                showError('文件过大，请选择小于50MB的图片');
                return;
            }

            this.currentFile = file;
            showLoading(true, '正在加载图片...');

            // 加载图片
            await this.imageProcessor.loadImage(file);

            // 显示原图预览
            this.showOriginalPreview(file);

            // 显示控制面板
            this.showControlPanel();

        } catch (error) {
            showError('图片加载失败：' + error.message);
            console.error('图片加载错误:', error);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 显示原图预览
     * @param {File} file - 文件对象
     */
    showOriginalPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.originalImage.src = e.target.result;

            // 获取图片信息
            const info = this.imageProcessor.getImageInfo();
            this.elements.imageDimensions.textContent = formatDimensions(info.width, info.height);
            this.elements.imageSize.textContent = formatFileSize(file.size);

            this.elements.originalPreviewSection.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /**
     * 显示控制面板
     */
    showControlPanel() {
        this.elements.controlSection.style.display = 'block';

        // 根据图片尺寸建议切割比例
        const info = this.imageProcessor.getImageInfo();
        const aspectRatio = info.width / info.height;

        if (aspectRatio > 2) {
            // 宽图，建议横向切割
            this.elements.rowsInput.value = 2;
            this.elements.colsInput.value = Math.round(aspectRatio);
        } else if (aspectRatio < 0.5) {
            // 高图，建议纵向切割
            this.elements.rowsInput.value = Math.round(1 / aspectRatio);
            this.elements.colsInput.value = 2;
        } else {
            // 方形或接近方形，建议网格切割
            const size = Math.round(Math.sqrt(aspectRatio * 4));
            this.elements.rowsInput.value = Math.min(size, 4);
            this.elements.colsInput.value = Math.min(Math.round(aspectRatio * size / 4), 4);
        }
    }

    /**
     * 处理图片切割
     */
    async handleProcess() {
        try {
            const rows = parseInt(this.elements.rowsInput.value);
            const cols = parseInt(this.elements.colsInput.value);
            const format = this.elements.formatSelect.value;
            const quality = parseFloat(this.elements.qualitySelect.value);
            const autoTrim = this.elements.autoTrimCheckbox.checked;

            // 验证输入
            if (rows < 1 || rows > 20 || cols < 1 || cols > 20) {
                showError('行数和列数必须在1-20之间');
                return;
            }

            const message = autoTrim
                ? `正在切割图片 (${rows}×${cols}) 并裁剪空白...`
                : `正在切割图片 (${rows}×${cols})...`;

            showLoading(true, message);

            // 执行切割，带进度回调
            this.cuttingResults = await this.imageProcessor.cutImage(
                rows,
                cols,
                format,
                quality,
                autoTrim,
                (progress) => {
                    const loadingText = document.querySelector('.loading-overlay p');
                    if (loadingText) {
                        loadingText.textContent = `正在处理... ${Math.round(progress)}%`;
                    }
                }
            );

            // 显示切割结果
            this.showCuttingResults();

        } catch (error) {
            showError('图片切割失败：' + error.message);
            console.error('切割错误:', error);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 显示切割结果
     */
    showCuttingResults() {
        // 清空之前的结果
        this.elements.cuttingGrid.innerHTML = '';
        this.selectedItems.clear();

        // 设置网格布局
        const rows = parseInt(this.elements.rowsInput.value);
        const cols = parseInt(this.elements.colsInput.value);
        this.elements.cuttingGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // 生成切割结果UI
        this.cuttingResults.forEach((piece, index) => {
            const itemElement = this.createCuttingItem(piece, index);
            this.elements.cuttingGrid.appendChild(itemElement);
        });

        // 显示结果区域
        this.elements.resultSection.style.display = 'block';

        // 滚动到结果区域
        this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 创建切割项UI元素
     * @param {Object} piece - 切割块对象
     * @param {number} index - 索引
     * @returns {HTMLElement} 切割项元素
     */
    createCuttingItem(piece, index) {
        const item = document.createElement('div');
        item.className = 'cutting-item';
        item.dataset.id = piece.id;

        const img = document.createElement('img');
        img.src = piece.dataUrl;
        img.alt = `切割块 ${index + 1}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        checkbox.addEventListener('change', () => this.toggleItemSelection(piece.id, checkbox.checked));

        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = '下载';
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadSinglePiece(piece);
        });

        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        itemInfo.textContent = `${piece.row + 1}-${piece.col + 1} (${piece.width}×${piece.height})`;

        overlay.appendChild(downloadBtn);
        item.appendChild(checkbox);
        item.appendChild(img);
        item.appendChild(overlay);
        item.appendChild(itemInfo);

        // 点击项切换选择
        item.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            this.toggleItemSelection(piece.id, checkbox.checked);
        });

        return item;
    }

    /**
     * 切换项选择状态
     * @param {string} id - 项ID
     * @param {boolean} selected - 是否选中
     */
    toggleItemSelection(id, selected) {
        const itemElement = document.querySelector(`[data-id="${id}"]`);

        if (selected) {
            this.selectedItems.add(id);
            itemElement.classList.add('selected');
        } else {
            this.selectedItems.delete(id);
            itemElement.classList.remove('selected');
        }

        this.updateSelectionButtons();
    }

    /**
     * 更新选择按钮状态
     */
    updateSelectionButtons() {
        const selectedCount = this.selectedItems.size;
        const totalCount = this.cuttingResults.length;

        this.elements.downloadSelectedBtn.disabled = selectedCount === 0;
        this.elements.downloadSelectedBtn.textContent =
            `下载选中 (${selectedCount})`;

        this.elements.selectAllBtn.textContent =
            this.selectedItems.size === totalCount ? '取消全选' : '全选';
    }

    /**
     * 处理重置
     */
    handleReset() {
        // 清理状态
        this.currentFile = null;
        this.cuttingResults = [];
        this.selectedItems.clear();
        this.imageProcessor.cleanup();

        // 重置UI
        this.elements.uploadSection.style.display = 'block';
        this.elements.controlSection.style.display = 'none';
        this.elements.originalPreviewSection.style.display = 'none';
        this.elements.resultSection.style.display = 'none';
        this.elements.fileInput.value = '';

        // 重置控制输入
        this.elements.rowsInput.value = 2;
        this.elements.colsInput.value = 8;
        this.elements.formatSelect.value = 'png';
        this.elements.qualitySelect.value = '0.8';

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * 处理全选/取消全选
     */
    handleSelectAll() {
        const items = document.querySelectorAll('.cutting-item');
        const allSelected = this.selectedItems.size === this.cuttingResults.length;

        items.forEach(item => {
            const checkbox = item.querySelector('.checkbox');
            const id = item.dataset.id;

            checkbox.checked = !allSelected;
            this.toggleItemSelection(id, !allSelected);
        });
    }

    /**
     * 处理下载选中项
     */
    async handleDownloadSelected() {
        const selectedPieces = this.cuttingResults.filter(
            piece => this.selectedItems.has(piece.id)
        );

        if (selectedPieces.length === 0) {
            showError('没有选中的切割块');
            return;
        }

        try {
            showLoading(true, '正在准备下载...');

            await this.imageProcessor.downloadSelectedPieces(
                selectedPieces,
                (current, total) => {
                    showLoading(true, `正在下载 ${current}/${total}...`);
                }
            );
        } catch (error) {
            showError('下载失败：' + error.message);
            console.error('下载错误:', error);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 处理下载全部
     */
    async handleDownloadAll() {
        try {
            showLoading(true, '正在准备下载全部图片...');

            await this.imageProcessor.downloadPiecesAsZip(
                this.cuttingResults,
                (current, total) => {
                    showLoading(true, `正在打包 ${current}/${total}...`);
                }
            );
        } catch (error) {
            showError('下载失败：' + error.message);
            console.error('下载错误:', error);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 下载单个切割块
     * @param {Object} piece - 切割块对象
     */
    downloadSinglePiece(piece) {
        try {
            this.imageProcessor.downloadPiece(piece);
        } catch (error) {
            showError('下载失败：' + error.message);
            console.error('下载错误:', error);
        }
    }
}