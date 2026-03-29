/**
 * 统一应用控制器 - 管理标签页切换和子应用协调
 */

class UnifiedApp {
    constructor() {
        this.currentTab = 'split';
        this.splitApp = null;
        this.cropApp = null;
        this.resumeApp = null;
        this.tabElements = {};

        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 初始化标签页引用
        this.initTabElements();

        // 初始化标签页事件
        this.initTabEvents();

        // 初始化切割应用（默认激活）
        this.splitApp = new SplitPicApp();
    }

    /**
     * 初始化标签页DOM元素
     */
    initTabElements() {
        this.tabElements = {
            buttons: document.querySelectorAll('.tab-btn'),
            contents: document.querySelectorAll('.tab-content'),
            splitTab: document.getElementById('split-tab'),
            cropTab: document.getElementById('crop-tab'),
            resumeTab: document.getElementById('resume-tab')
        };
    }

    /**
     * 初始化标签页切换事件
     */
    initTabEvents() {
        this.tabElements.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName - 目标标签页名称
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) {
            console.log(`已经在${tabName}标签页`);
            return;
        }

        console.log(`切换到${tabName}标签页`);

        // 1. 停用当前标签页的应用
        this.deactivateCurrentApp();

        // 2. 更新标签按钮状态
        this.updateTabButtons(tabName);

        // 3. 更新内容区域显示
        this.updateTabContent(tabName);

        // 4. 激活目标标签页的应用
        this.activateTargetApp(tabName);

        // 5. 更新页面标题
        this.updatePageTitle(tabName);

        // 6. 更新当前标签页状态
        this.currentTab = tabName;

        console.log(`标签页切换完成: ${tabName}`);
    }

    /**
     * 停用当前应用
     */
    deactivateCurrentApp() {
        if (this.currentTab === 'split' && this.splitApp) {
            this.splitApp.deactivate();
        } else if (this.currentTab === 'crop' && this.cropApp) {
            this.cropApp.deactivate();
        } else if (this.currentTab === 'resume' && this.resumeApp) {
            this.resumeApp.deactivate();
        }
    }

    /**
     * 更新标签按钮状态
     * @param {string} activeTab - 激活的标签页
     */
    updateTabButtons(activeTab) {
        this.tabElements.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
        });
    }

    /**
     * 更新标签内容显示
     * @param {string} activeTab - 激活的标签页
     */
    updateTabContent(activeTab) {
        this.tabElements.contents.forEach(content => {
            content.classList.toggle('active', content.id === `${activeTab}-tab`);
        });
    }

    /**
     * 激活目标应用
     * @param {string} tabName - 标签页名称
     */
    activateTargetApp(tabName) {
        if (tabName === 'split') {
            if (!this.splitApp) {
                this.splitApp = new SplitPicApp();
            }
            this.splitApp.activate();
        } else if (tabName === 'crop') {
            if (!this.cropApp) {
                // 懒加载裁剪应用
                console.log('初始化裁剪应用');
                this.cropApp = new CropApp();
            }
            this.cropApp.activate();
        } else if (tabName === 'resume') {
            if (!this.resumeApp) {
                console.log('初始化简历应用');
                this.resumeApp = new ResumeApp();
            }
            this.resumeApp.activate();
        }
    }

    /**
     * 更新页面标题
     * @param {string} tabName - 标签页名称
     */
    updatePageTitle(tabName) {
        const titles = {
            split: 'ToolBox - 智能图片切割工具',
            crop: 'ToolBox - 智能图片裁剪工具',
            resume: 'ToolBox - 简历导出工具'
        };
        document.title = titles[tabName] || 'ToolBox - 智能在线工具集';
    }

    /**
     * 获取当前激活的应用
     * @returns {Object|null} 当前激活的应用实例
     */
    getActiveApp() {
        if (this.currentTab === 'split') {
            return this.splitApp;
        } else if (this.currentTab === 'crop') {
            return this.cropApp;
        } else if (this.currentTab === 'resume') {
            return this.resumeApp;
        }
        return null;
    }
}

// DOM加载完成后初始化统一应用
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedApp = new UnifiedApp();
});
