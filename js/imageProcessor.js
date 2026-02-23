// 图片处理核心模块

class ImageProcessor {
    constructor() {
        this.image = null;
        this.canvas = null;
        this.ctx = null;
        this.cuttingResults = [];
    }

    /**
     * 加载图片
     * @param {File} file - 图片文件
     * @returns {Promise<HTMLImageElement>} 加载的图片元素
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            if (!isValidImageFile(file)) {
                reject(new Error('不支持的图片格式'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.image = img;
                    resolve(img);
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取图片信息
     * @returns {Object} 图片信息
     */
    getImageInfo() {
        if (!this.image) {
            throw new Error('没有加载图片');
        }

        return {
            width: this.image.width,
            height: this.image.height,
            aspectRatio: this.image.width / this.image.height
        };
    }

    /**
     * 切割图片
     * @param {number} rows - 行数
     * @param {number} cols - 列数
     * @param {string} format - 输出格式
     * @param {number} quality - 输出质量 (0-1)
     * @param {boolean} autoTrim - 是否自动裁剪空白边缘
     * @param {Function} onProgress - 进度回调函数
     * @returns {Promise<Array>} 切割结果数组
     */
    async cutImage(rows, cols, format = 'png', quality = 0.9, autoTrim = false, onProgress = null) {
        if (!this.image) {
            throw new Error('没有加载图片');
        }

        const { width, height } = this.image;
        const pieceWidth = Math.floor(width / cols);
        const pieceHeight = Math.floor(height / rows);

        this.cuttingResults = [];
        const mimeType = getImageMimeType(format);
        const totalPieces = rows * cols;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let canvas = this.createPieceCanvas(
                    pieceWidth,
                    pieceHeight,
                    col * pieceWidth,
                    row * pieceHeight
                );

                let finalWidth = pieceWidth;
                let finalHeight = pieceHeight;

                // 自动裁剪空白边缘
                if (autoTrim) {
                    const bounds = this.detectContentBounds(canvas, 240);

                    // 如果检测到内容边界且需要裁剪
                    if (bounds && (bounds.width < canvas.width || bounds.height < canvas.height)) {
                        // 确保裁剪后尺寸不会太小
                        if (bounds.width >= 10 && bounds.height >= 10) {
                            canvas = this.trimCanvas(canvas, bounds);
                            finalWidth = bounds.width;
                            finalHeight = bounds.height;
                        }
                    }
                }

                const dataUrl = canvas.toDataURL(mimeType, quality);

                this.cuttingResults.push({
                    id: generateId(),
                    row: row,
                    col: col,
                    dataUrl: dataUrl,
                    width: finalWidth,
                    height: finalHeight,
                    index: row * cols + col,
                    totalPieces: totalPieces,
                    format: format
                });

                // 报告进度
                if (onProgress) {
                    const progress = ((row * cols + col + 1) / totalPieces) * 100;
                    onProgress(progress);
                }
            }
        }

        return this.cuttingResults;
    }

    /**
     * 创建单个切割块的Canvas
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {number} sx - 源图x坐标
     * @param {number} sy - 源图y坐标
     * @returns {HTMLCanvasElement} Canvas元素
     */
    createPieceCanvas(width, height, sx, sy) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        // 设置高质量绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制图片片段
        ctx.drawImage(
            this.image,
            sx, sy, width, height,  // 源图区域
            0, 0, width, height    // 目标区域
        );

        return canvas;
    }

    /**
     * 获取切割结果
     * @returns {Array} 切割结果数组
     */
    getCuttingResults() {
        return this.cuttingResults;
    }

    /**
     * 下载单个切割结果
     * @param {Object} piece - 切割块对象
     * @param {string} filename - 文件名
     */
    downloadPiece(piece, filename = null) {
        if (!piece || !piece.dataUrl) {
            throw new Error('无效的切割块');
        }

        const defaultFilename = generateFileName(
            'cut_image',
            piece.index,
            piece.format
        );

        downloadFile(piece.dataUrl, filename || defaultFilename);
    }

    /**
     * 下载所有选中的切割结果
     * @param {Array} selectedPieces - 选中的切割块数组
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<void>}
     */
    async downloadSelectedPieces(selectedPieces, onProgress = null) {
        if (!selectedPieces || selectedPieces.length === 0) {
            throw new Error('没有选中的切割块');
        }

        // 如果只有一个，直接下载
        if (selectedPieces.length === 1) {
            this.downloadPiece(selectedPieces[0]);
            return;
        }

        // 多个文件打包下载
        await this.downloadPiecesAsZip(selectedPieces, onProgress);
    }

    /**
     * 创建ZIP文件并下载
     * @param {Array} pieces - 切割块数组
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<void>}
     */
    async downloadPiecesAsZip(pieces, onProgress = null) {
        try {
            // 尝试加载JSZip库
            if (typeof window.zipLoader !== 'undefined') {
                await window.zipLoader.load();
            }

            if (typeof JSZip !== 'undefined') {
                await this.createZipDownload(pieces, onProgress);
            } else {
                // 降级为逐个下载
                await this.fallbackDownload(pieces, onProgress);
            }
        } catch (error) {
            console.error('ZIP下载失败:', error);
            showError('ZIP下载失败，将改为逐个下载');
            await this.fallbackDownload(pieces, onProgress);
        }
    }

    /**
     * 使用JSZip创建ZIP下载
     * @param {Array} pieces - 切割块数组
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<void>}
     */
    async createZipDownload(pieces, onProgress = null) {
        const zip = new JSZip();
        const imgFolder = zip.folder("cut_images");

        // 添加所有图片到ZIP
        for (let i = 0; i < pieces.length; i++) {
            const piece = pieces[i];
            const filename = generateFileName(
                'cut_image',
                piece.index,
                piece.format
            );

            // 将dataURL转换为Blob
            const response = await fetch(piece.dataUrl);
            const blob = await response.blob();
            imgFolder.file(filename, blob);

            if (onProgress) {
                onProgress(i + 1, pieces.length);
            }
        }

        // 生成ZIP文件
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        downloadFile(zipUrl, 'cut_images.zip');

        // 清理URL
        setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    }

    /**
     * 降级为逐个下载
     * @param {Array} pieces - 切割块数组
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<void>}
     */
    async fallbackDownload(pieces, onProgress = null) {
        for (let i = 0; i < pieces.length; i++) {
            this.downloadPiece(pieces[i]);
            if (onProgress) {
                onProgress(i + 1, pieces.length);
            }
            // 添加延迟避免浏览器阻止多个下载
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    /**
     * 生成预览图片
     * @param {Object} piece - 切割块对象
     * @param {number} maxWidth - 最大宽度
     * @param {number} maxHeight - 最大高度
     * @returns {string} 预览图片URL
     */
    generatePreview(piece, maxWidth = 300, maxHeight = 200) {
        if (!piece || !piece.dataUrl) {
            return null;
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const { width, height } = this.calculatePreviewSize(
                    piece.width,
                    piece.height,
                    maxWidth,
                    maxHeight
                );

                const canvas = createCanvas(img, width, height);
                resolve(canvas.toDataURL());
            };
            img.src = piece.dataUrl;
        });
    }

    /**
     * 计算预览尺寸
     * @param {number} originalWidth - 原始宽度
     * @param {number} originalHeight - 原始高度
     * @param {number} maxWidth - 最大宽度
     * @param {number} maxHeight - 最大高度
     * @returns {Object} 计算后的尺寸
     */
    calculatePreviewSize(originalWidth, originalHeight, maxWidth, maxHeight) {
        const aspectRatio = originalWidth / originalHeight;
        let width = originalWidth;
        let height = originalHeight;

        // 按宽度缩放
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }

        // 按高度缩放
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    /**
     * 判断像素是否为空白（透明或浅色）
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     * @param {number} a - 透明度 (0-255)
     * @param {number} threshold - 浅色阈值 (0-255)
     * @returns {boolean} 是否为空白像素
     */
    isEmptyPixel(r, g, b, a, threshold) {
        // 透明像素
        if (a < 10) return true;
        // 浅色像素（接近白色）
        if (a > 250 && r > threshold && g > threshold && b > threshold) return true;
        return false;
    }

    /**
     * 检测 canvas 中非空白内容的边界
     * @param {HTMLCanvasElement} canvas - 要检测的 canvas
     * @param {number} threshold - 浅色阈值 (默认 240)
     * @returns {Object|null} 内容边界 {top, left, width, height} 或 null（整块都是空白）
     */
    detectContentBounds(canvas, threshold = 240) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        let top = height;
        let bottom = 0;
        let left = width;
        let right = 0;

        const step = 2; // 采样步长，提升性能

        // 从上往下扫描
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                if (!this.isEmptyPixel(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3], threshold)) {
                    top = Math.min(top, y);
                    break;
                }
            }
            if (top < height) break; // 找到第一行非空白像素后停止
        }

        // 从下往上扫描
        for (let y = height - 1; y >= 0; y -= step) {
            for (let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                if (!this.isEmptyPixel(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3], threshold)) {
                    bottom = Math.max(bottom, y);
                    break;
                }
            }
            if (bottom > 0) break;
        }

        // 从左往右扫描
        for (let x = 0; x < width; x += step) {
            for (let y = 0; y < height; y += step) {
                const i = (y * width + x) * 4;
                if (!this.isEmptyPixel(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3], threshold)) {
                    left = Math.min(left, x);
                    break;
                }
            }
            if (left < width) break;
        }

        // 从右往左扫描
        for (let x = width - 1; x >= 0; x -= step) {
            for (let y = 0; y < height; y += step) {
                const i = (y * width + x) * 4;
                if (!this.isEmptyPixel(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3], threshold)) {
                    right = Math.max(right, x);
                    break;
                }
            }
            if (right > 0) break;
        }

        // 如果没有找到任何非空白像素
        if (top >= height || bottom <= 0 || left >= width || right <= 0) {
            return null;
        }

        // 确保边界有效
        const contentWidth = right - left + 1;
        const contentHeight = bottom - top + 1;

        if (contentWidth <= 0 || contentHeight <= 0) {
            return null;
        }

        return {
            top: top,
            left: left,
            width: contentWidth,
            height: contentHeight
        };
    }

    /**
     * 根据检测到的边界裁剪 canvas
     * @param {HTMLCanvasElement} canvas - 要裁剪的 canvas
     * @param {Object} bounds - 边界信息 {top, left, width, height}
     * @returns {HTMLCanvasElement} 裁剪后的 canvas
     */
    trimCanvas(canvas, bounds) {
        const trimmedCanvas = document.createElement('canvas');
        const ctx = trimmedCanvas.getContext('2d');

        trimmedCanvas.width = bounds.width;
        trimmedCanvas.height = bounds.height;

        // 设置高质量绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 从原 canvas 复制内容区域
        ctx.drawImage(
            canvas,
            bounds.left, bounds.top, bounds.width, bounds.height,  // 源区域
            0, 0, bounds.width, bounds.height                       // 目标区域
        );

        return trimmedCanvas;
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.image = null;
        this.cuttingResults = [];
        if (this.canvas) {
            this.canvas = null;
            this.ctx = null;
        }
    }
}