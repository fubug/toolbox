/**
 * 简历导出应用 - Markdown 输入 → 模板美化 → PDF 导出
 */

class ResumeApp {
    constructor() {
        // DOM 元素
        this.editorSection = document.getElementById('resume-editorSection');
        this.previewSection = document.getElementById('resume-previewSection');
        this.markdownInput = document.getElementById('resume-markdownInput');
        this.templateSelect = document.getElementById('resume-templateSelect');
        this.previewBtn = document.getElementById('resume-previewBtn');
        this.exportBtn = document.getElementById('resume-exportBtn');
        this.previewContainer = document.getElementById('resume-previewContainer');
        this.editBtn = document.getElementById('resume-editBtn');
        this.confirmExportBtn = document.getElementById('resume-confirmExportBtn');

        // State
        this.isActive = false;
        this.depsLoaded = false;
        this.currentTemplate = 'classic';

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSampleContent();
        this.isActive = true;
    }

    activate() {
        if (!this.isActive) {
            this.isActive = true;
            console.log('简历应用已激活');
        }
    }

    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            console.log('简历应用已停用');
        }
    }

    bindEvents() {
        this.previewBtn.addEventListener('click', () => this.handlePreview());
        this.exportBtn.addEventListener('click', () => this.handleExport());
        this.editBtn.addEventListener('click', () => this.handleEdit());
        this.confirmExportBtn.addEventListener('click', () => this.handleExport());
        this.templateSelect.addEventListener('change', () => {
            this.currentTemplate = this.templateSelect.value;
            // 如果已在预览模式，实时更新模板
            if (this.previewSection.style.display !== 'none') {
                this.applyTemplate();
            }
        });
    }

    /**
     * 加载示例简历内容
     */
    loadSampleContent() {
        const sample = `# 张三
**高级前端工程师** | zhangsan@email.com | 138-0000-0000 | 北京

---

## 个人简介

拥有 8 年前端开发经验，精通 React/Vue 生态，具备丰富的大型项目架构和团队管理经验。热衷于技术创新，持续关注前端领域最新发展。

---

## 工作经历

### ABC 科技有限公司 | 高级前端工程师 | 2021 - 至今

- 主导公司核心产品前端架构重构，性能提升 40%
- 搭建前端组件库，覆盖 50+ 业务组件，提升团队开发效率 30%
- 带领 5 人前端团队，制定代码规范和 Review 流程

### XYZ 互联网公司 | 前端工程师 | 2018 - 2021

- 负责电商平台前端开发，日均 PV 100 万+
- 优化首屏加载时间从 3.2s 降至 1.5s
- 推动团队从 jQuery 迁移至 Vue 技术栈

---

## 教育背景

### 北京大学 | 计算机科学与技术 | 硕士 | 2015 - 2018

### 武汉大学 | 软件工程 | 学士 | 2011 - 2015

---

## 专业技能

- **前端框架**: React, Vue, Next.js, Nuxt.js
- **编程语言**: JavaScript, TypeScript, HTML5, CSS3
- **工程化**: Webpack, Vite, Rollup, CI/CD
- **其他**: Node.js, GraphQL, Docker, Git

---

## 项目亮点

### 智能数据可视化平台

基于 React + D3.js 构建的企业级数据可视化平台，支持拖拽式图表配置、实时数据更新和多维数据分析。服务 200+ 企业客户，月活跃用户 5 万+。`;

        this.markdownInput.value = sample;
    }

    /**
     * 动态加载依赖库（marked.js + html2pdf.js）
     */
    async loadDeps() {
        if (this.depsLoaded) return;

        const loadScript = (src, globalName) => {
            return new Promise((resolve, reject) => {
                if (window[globalName]) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => {
                    if (window[globalName]) {
                        resolve();
                    } else {
                        reject(new Error(`${globalName} 加载失败`));
                    }
                };
                script.onerror = () => reject(new Error(`${globalName} 网络加载错误`));
                document.head.appendChild(script);
            });
        };

        try {
            showLoading(true, '正在加载组件...');
            await Promise.all([
                loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js', 'marked'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', 'html2pdf')
            ]);
            this.depsLoaded = true;
        } catch (error) {
            console.error('依赖加载失败:', error);
            showError('组件加载失败，请检查网络连接后重试');
            throw error;
        } finally {
            showLoading(false);
        }
    }

    /**
     * 处理预览
     */
    async handlePreview() {
        const markdown = this.markdownInput.value.trim();
        if (!markdown) {
            showError('请输入简历内容');
            return;
        }

        try {
            await this.loadDeps();

            // 渲染 Markdown 为 HTML
            const htmlContent = marked.parse(markdown);
            this.previewContainer.innerHTML = htmlContent;

            // 应用模板样式
            this.applyTemplate();

            // 切换到预览视图
            this.editorSection.style.display = 'none';
            this.previewSection.style.display = 'block';
            this.exportBtn.disabled = false;

        } catch (error) {
            console.error('预览失败:', error);
            showError('预览失败：' + error.message);
        }
    }

    /**
     * 应用模板样式
     */
    applyTemplate() {
        const templates = ['resume-classic', 'resume-modern', 'resume-creative'];
        templates.forEach(t => this.previewContainer.classList.remove(t));
        this.previewContainer.classList.add(`resume-${this.currentTemplate}`);
    }

    /**
     * 处理 PDF 导出
     */
    async handleExport() {
        if (!this.previewContainer.innerHTML) {
            showError('请先预览简历');
            return;
        }

        try {
            showLoading(true, '正在生成 PDF...');

            // 确保依赖已加载
            await this.loadDeps();

            // 创建一个临时容器用于 PDF 生成（确保 A4 尺寸）
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = this.previewContainer.innerHTML;
            tempContainer.className = this.previewContainer.className;
            tempContainer.style.cssText = `
                width: 210mm;
                padding: 15mm 20mm;
                background: white;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
            `;

            // 注入模板内联样式到临时容器
            const styleEl = document.createElement('style');
            styleEl.textContent = this.getInlineTemplateStyles();
            tempContainer.prepend(styleEl);

            document.body.appendChild(tempContainer);

            const opt = {
                margin: 0,
                filename: 'resume.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                }
            };

            await html2pdf().set(opt).from(tempContainer).save();

            // 清理临时容器
            document.body.removeChild(tempContainer);

            showSuccess('PDF 导出成功！');

        } catch (error) {
            console.error('PDF 导出失败:', error);
            showError('PDF 导出失败：' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * 返回编辑视图
     */
    handleEdit() {
        this.previewSection.style.display = 'none';
        this.editorSection.style.display = 'block';
    }

    /**
     * 获取模板内联样式（用于 PDF 生成时的临时容器）
     */
    getInlineTemplateStyles() {
        const baseStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            h1 { font-size: 28px; margin-bottom: 4px; }
            h2 { font-size: 20px; margin: 20px 0 12px; padding-bottom: 6px; }
            h3 { font-size: 16px; margin: 14px 0 8px; }
            p { margin: 6px 0; line-height: 1.7; }
            ul { margin: 6px 0 6px 24px; }
            li { margin: 4px 0; line-height: 1.6; }
            strong { font-weight: 600; }
            hr { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
            a { color: inherit; text-decoration: none; }
        `;

        const classicStyles = `
            h1 { color: #1a1a1a; text-align: center; }
            h2 { color: #1a1a1a; border-bottom: 2px solid #333; }
            h3 { color: #333; }
        `;

        const modernStyles = `
            h1 { color: #2c3e50; }
            h2 { color: #2980b9; border-bottom: 2px solid #2980b9; }
            h3 { color: #34495e; }
            strong { color: #2c3e50; }
        `;

        const creativeStyles = `
            h1 { color: #6c5ce7; text-align: center; }
            h2 { color: #a29bfe; border-bottom: none; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; }
            h3 { color: #6c5ce7; }
            strong { color: #6c5ce7; }
            hr { border-top: 2px dashed #a29bfe; }
        `;

        const templateMap = {
            classic: classicStyles,
            modern: modernStyles,
            creative: creativeStyles
        };

        return baseStyles + (templateMap[this.currentTemplate] || '');
    }

    destroy() {
        this.isActive = false;
    }
}
