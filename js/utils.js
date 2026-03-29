// 工具函数库

/**
 * 显示自动消失的 toast 提示
 * @param {string} message - 提示内容
 * @param {'success'|'error'} type - 提示类型
 */
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.3s, transform 0.3s;
    `;

    if (type === 'error') {
        container.style.background = '#e74c3c';
        container.textContent = message;
    } else {
        container.style.background = '#27ae60';
        container.textContent = message;
    }

    document.body.appendChild(container);
    // Trigger animation
    requestAnimationFrame(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        container.style.opacity = '0';
        container.style.transform = 'translateY(-10px)';
        setTimeout(() => container.remove(), 300);
    }, 2000);
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化图片尺寸
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @returns {string} 格式化后的尺寸
 */
function formatDimensions(width, height) {
    return `${width} × ${height} px`;
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 创建下载链接
 * @param {string} url - 数据URL
 * @param {string} filename - 文件名
 */
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    showToast(message, 'error');
    console.error(message);
}

/**
 * 显示加载状态
 * @param {boolean} show - 是否显示
 * @param {string} message - 加载信息
 */
function showLoading(show = true, message = '正在处理...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');

    if (show) {
        text.textContent = message;
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为支持的图片格式
 */
function isValidImageFile(file) {
    const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml'
    ];

    return validTypes.includes(file.type);
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名
 */
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

/**
 * 生成带编号的文件名
 * @param {string} baseName - 基础文件名
 * @param {number} index - 索引
 * @param {string} extension - 扩展名
 * @returns {string} 带编号的文件名
 */
function generateFileName(baseName, index, extension) {
    const cleanName = baseName.replace(/\.[^/.]+$/, ""); // 移除原扩展名
    return `${cleanName}_${index + 1}.${extension}`;
}

/**
 * 创建Canvas并绘制图片
 * @param {HTMLImageElement} img - 图片元素
 * @param {number} width - 目标宽度
 * @param {number} height - 目标高度
 * @returns {HTMLCanvasElement} Canvas元素
 */
function createCanvas(img, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    // 使用高质量绘制
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    return canvas;
}

/**
 * 获取图片MIME类型
 * @param {string} format - 格式字符串
 * @returns {string} MIME类型
 */
function getImageMimeType(format) {
    const mimeTypes = {
        'png': 'image/png',
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'webp': 'image/webp'
    };

    return mimeTypes[format.toLowerCase()] || 'image/png';
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 检查浏览器支持
 * @returns {Object} 支持特性对象
 */
function checkBrowserSupport() {
    return {
        canvas: !!document.createElement('canvas').getContext,
        fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
        dragDrop: 'draggable' in document.createElement('div'),
        webp: (function() {
            const canvas = document.createElement('canvas');
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        })()
    };
}

/**
 * 限制值在范围内（裁剪工具需要）
 * @param {number} value - 要限制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 读取文件为DataURL（裁剪工具需要）
 * @param {File} file - 文件对象
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

/**
 * 加载图片（裁剪工具需要）
 * @param {string} src - 图片源
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = src;
    });
}

/**
 * 下载Canvas为图片（裁剪工具需要）
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {string} filename - 文件名
 * @param {string} format - 格式
 */
function downloadCanvas(canvas, filename, format = 'png') {
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`);
    link.click();
}

/**
 * 显示成功消息（裁剪工具需要）
 * @param {string} message - 消息内容
 */
function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * 验证文件大小（裁剪工具需要）
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean}
 */
function isValidFileSize(file, maxSize = 30 * 1024 * 1024) {
    return file.size <= maxSize;
}