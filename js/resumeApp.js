/**
 * 简历导出应用 - Markdown 输入 → 模板美化 → PDF 导出
 * 支持本地草稿自动保存与管理
 */

class ResumeApp {
    constructor() {
        // DOM 元素
        this.editorSection = document.getElementById('resume-editorSection');
        this.previewSection = document.getElementById('resume-previewSection');
        this.markdownInput = document.getElementById('resume-markdownInput');
        this.templatePicker = document.getElementById('resume-templatePicker');
        this.previewBtn = document.getElementById('resume-previewBtn');
        this.exportBtn = document.getElementById('resume-exportBtn');
        this.previewContainer = document.getElementById('resume-previewContainer');
        this.editBtn = document.getElementById('resume-editBtn');
        this.confirmExportBtn = document.getElementById('resume-confirmExportBtn');
        this.exportMdBtn = document.getElementById('resume-exportMdBtn');

        // Draft DOM
        this.draftList = document.getElementById('resume-draftList');
        this.draftToggle = document.getElementById('resume-draftToggle');
        this.draftPanel = document.getElementById('resume-draftPanel');
        this.saveDraftBtn = document.getElementById('resume-saveDraftBtn');

        // State
        this.isActive = false;
        this.depsLoaded = false;
        this.currentTemplate = 'classic';
        this.autoSaveTimer = null;
        this.currentDraftId = null;
        this.STORAGE_KEY = 'toolbox_resume_drafts';
        this.AUTOSAVE_KEY = 'toolbox_resume_autosave';

        this.init();
    }

    init() {
        this.bindEvents();
        this.restoreAutoSave() || this.loadSampleContent();
        this.renderDraftList();
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

        // Template card clicks
        this.templatePicker.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (!card) return;
            this.currentTemplate = card.dataset.template;
            this.templatePicker.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            if (this.previewSection.style.display !== 'none') {
                this.applyTemplate();
            }
        });

        // Auto-save on input (debounced 2s)
        this.markdownInput.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.autoSave(), 2000);
        });

        // Draft panel toggle
        this.draftToggle.addEventListener('click', () => {
            this.draftPanel.classList.toggle('open');
        });

        // Save draft button
        this.saveDraftBtn.addEventListener('click', () => this.handleSaveDraft());

        // Export markdown button
        this.exportMdBtn.addEventListener('click', () => this.handleExportMd());

        // Draft list delegation (load / delete)
        this.draftList.addEventListener('click', (e) => {
            const loadBtn = e.target.closest('.draft-load');
            const deleteBtn = e.target.closest('.draft-delete');
            if (loadBtn) {
                this.loadDraft(loadBtn.closest('.draft-item').dataset.id);
            } else if (deleteBtn) {
                this.deleteDraft(deleteBtn.closest('.draft-item').dataset.id);
            }
        });
    }

    // ===================== Draft Storage =====================

    getDrafts() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    saveDrafts(drafts) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drafts));
    }

    /**
     * Auto-save current content + template to a special key
     */
    autoSave() {
        const content = this.markdownInput.value;
        if (!content.trim()) return;
        const data = { content, template: this.currentTemplate, draftId: this.currentDraftId, updatedAt: Date.now() };
        localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(data));
    }

    /**
     * Restore from auto-save on startup. Returns true if restored.
     */
    restoreAutoSave() {
        try {
            const data = JSON.parse(localStorage.getItem(this.AUTOSAVE_KEY));
            if (data && data.content) {
                this.markdownInput.value = data.content;
                if (data.template) {
                    this.currentTemplate = data.template;
                    this.templatePicker.querySelectorAll('.template-card').forEach(c => {
                        c.classList.toggle('active', c.dataset.template === this.currentTemplate);
                    });
                }
                if (data.draftId) {
                    this.currentDraftId = data.draftId;
                }
                return true;
            }
        } catch { /* ignore */ }
        return false;
    }

    /**
     * Save as a named draft
     */
    handleSaveDraft() {
        const content = this.markdownInput.value.trim();
        if (!content) {
            showError('没有可保存的内容');
            return;
        }

        // If editing an existing draft, update it
        if (this.currentDraftId) {
            const drafts = this.getDrafts();
            const draft = drafts.find(d => d.id === this.currentDraftId);
            if (draft) {
                draft.content = content;
                draft.template = this.currentTemplate;
                draft.updatedAt = Date.now();
                this.saveDrafts(drafts);
                this.renderDraftList();
                showSuccess('草稿已更新');
                return;
            }
        }

        // New draft — use first heading line as name
        const name = this.extractDraftName(content);
        const drafts = this.getDrafts();
        drafts.unshift({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name,
            content,
            template: this.currentTemplate,
            updatedAt: Date.now()
        });
        this.saveDrafts(drafts);
        this.currentDraftId = drafts[0].id;
        this.renderDraftList();
        showSuccess('草稿已保存');
    }

    extractDraftName(content) {
        const firstLine = content.split('\n')[0].trim();
        // Remove markdown heading markers
        const name = firstLine.replace(/^#+\s*/, '').trim();
        return name || '未命名草稿';
    }

    loadDraft(id) {
        const drafts = this.getDrafts();
        const draft = drafts.find(d => d.id === id);
        if (!draft) return;

        this.markdownInput.value = draft.content;
        this.currentDraftId = draft.id;
        this.currentTemplate = draft.template || 'classic';
        this.templatePicker.querySelectorAll('.template-card').forEach(c => {
            c.classList.toggle('active', c.dataset.template === this.currentTemplate);
        });
        this.autoSave();
        this.renderDraftList();

        // Close panel on mobile
        if (window.innerWidth < 768) {
            this.draftPanel.classList.remove('open');
        }
    }

    deleteDraft(id) {
        let drafts = this.getDrafts();
        drafts = drafts.filter(d => d.id !== id);
        this.saveDrafts(drafts);
        if (this.currentDraftId === id) {
            this.currentDraftId = null;
        }
        this.renderDraftList();
    }

    renderDraftList() {
        const drafts = this.getDrafts();
        if (drafts.length === 0) {
            this.draftList.innerHTML = '<p class="draft-empty">暂无保存的草稿</p>';
            return;
        }
        this.draftList.innerHTML = drafts.map(d => {
            const time = this.formatTime(d.updatedAt);
            const isActive = d.id === this.currentDraftId;
            return `
                <div class="draft-item${isActive ? ' active' : ''}" data-id="${d.id}">
                    <div class="draft-info">
                        <span class="draft-name">${this.escapeHtml(d.name)}</span>
                        <span class="draft-time">${time}</span>
                    </div>
                    <div class="draft-actions">
                        <button class="draft-load" title="加载此草稿">${isActive ? '编辑中' : '加载'}</button>
                        <button class="draft-delete" title="删除此草稿">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${mm}-${dd} ${hh}:${mi}`;
    }

    escapeHtml(str) {
        const el = document.createElement('span');
        el.textContent = str;
        return el.innerHTML;
    }

    // ===================== Original Features =====================

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

            // 将第一个 hr 之前的内容包裹为 header 区域
            this.wrapHeaderSection();

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
     * 将第一个 <hr> 之前的元素包裹到 <div class="resume-header"> 中
     */
    wrapHeaderSection() {
        const container = this.previewContainer;
        const firstHr = container.querySelector('hr');
        if (!firstHr) return;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'resume-header';

        // 把 firstHr 之前的所有兄弟节点移入 headerDiv
        while (container.firstChild && container.firstChild !== firstHr) {
            headerDiv.appendChild(container.firstChild);
        }

        // 在 firstHr 前插入 headerDiv
        container.insertBefore(headerDiv, firstHr);
    }

    /**
     * 应用模板样式
     */
    applyTemplate() {
        const templates = ['resume-classic', 'resume-modern', 'resume-creative', 'resume-academic', 'resume-business', 'resume-fresh', 'resume-tech'];
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

            // 保存当前滚动位置，导出前滚到顶部避免 html2canvas 偏移问题
            const savedScrollY = window.scrollY;
            window.scrollTo(0, 0);

            // 创建一个临时容器用于 PDF 生成（确保 A4 尺寸）
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = this.previewContainer.innerHTML;
            tempContainer.className = this.previewContainer.className;
            const isDarkTemplate = this.currentTemplate === 'tech';
            tempContainer.style.cssText = `
                width: 210mm;
                padding: 15mm 20mm;
                background: ${isDarkTemplate ? '#1a1a2e' : 'white'};
                font-size: 14px;
                line-height: 1.6;
                color: ${isDarkTemplate ? '#e0e0e0' : '#333'};
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
            window.scrollTo(0, savedScrollY);
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
     * 导出当前编辑内容为 Markdown 文件
     */
    handleExportMd() {
        const content = this.markdownInput.value.trim();
        if (!content) {
            showError('没有可导出的内容');
            return;
        }
        // Use first heading as filename
        const name = this.extractDraftName(content).replace(/[/\\?%*:|"<>]/g, '_');
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess('Markdown 文件已导出');
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
            .resume-header { text-align: center; }
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
            h1 { color: #2c3e50; text-align: center; }
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

        const academicStyles = `
            body { font-family: 'Georgia', 'Times New Roman', serif; }
            h1 { color: #000; font-size: 26px; text-align: center; letter-spacing: 4px; border-bottom: none; margin-bottom: 2px; }
            h2 { color: #000; font-size: 17px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 22px; }
            h3 { color: #222; font-size: 15px; font-style: italic; }
            p, li { font-size: 13.5px; line-height: 1.75; color: #222; }
            strong { color: #000; font-weight: 700; }
            hr { border-top: 1px solid #999; }
            ul { list-style-type: disc; }
        `;

        const businessStyles = `
            h1 { color: #1b2a4a; font-size: 28px; letter-spacing: 2px; text-align: center; }
            h2 { color: #1b2a4a; border-left: 4px solid #c9a961; padding-left: 12px; border-bottom: none; margin-top: 24px; font-size: 18px; }
            h3 { color: #2c3e50; font-size: 15px; }
            p, li { color: #3d3d3d; }
            strong { color: #1b2a4a; }
            hr { border-top: 1px solid #c9a961; }
            ul { list-style-type: square; }
            li::marker { color: #c9a961; }
        `;

        const freshStyles = `
            h1 { color: #2d8f5e; text-align: center; font-size: 28px; }
            h2 { color: #27ae60; border-bottom: 2px solid #a8e6cf; padding-bottom: 6px; margin-top: 22px; }
            h3 { color: #2d8f5e; }
            p, li { color: #444; }
            strong { color: #27ae60; }
            hr { border-top: 2px dotted #a8e6cf; }
            li::marker { color: #6dd5a0; }
            h1::after { content: ''; display: block; width: 60px; height: 3px; background: #a8e6cf; margin: 8px auto 0; border-radius: 2px; }
        `;

        const techStyles = `
            body { background: #1a1a2e; color: #e0e0e0; }
            .resume-header { text-align: left; }
            h1 { color: #00d4ff; font-family: 'Courier New', monospace; text-align: left; font-size: 26px; }
            h1::before { content: '> '; color: #6c7a89; }
            h2 { color: #00d4ff; border-bottom: 1px solid #16213e; padding-bottom: 4px; margin-top: 22px; font-size: 18px; font-family: 'Courier New', monospace; }
            h2::before { content: '// '; color: #6c7a89; }
            h3 { color: #7fdbca; font-size: 15px; }
            p, li { color: #c5c8c6; }
            strong { color: #00d4ff; }
            a { color: #7fdbca; }
            hr { border-top: 1px solid #16213e; }
            li::marker { color: #00d4ff; }
            code { background: #16213e; color: #7fdbca; padding: 1px 4px; border-radius: 3px; }
        `;

        const templateMap = {
            classic: classicStyles,
            modern: modernStyles,
            creative: creativeStyles,
            academic: academicStyles,
            business: businessStyles,
            fresh: freshStyles,
            tech: techStyles
        };

        return baseStyles + (templateMap[this.currentTemplate] || '');
    }

    destroy() {
        this.isActive = false;
    }
}
