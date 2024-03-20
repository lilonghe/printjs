function printjs({ container, pageSize = { width: 0, height: 0 } }) {
    this.pageSize = pageSize;
    this.container = container;

    this.pageNodes = []; // 页面节点
    this.pages = []; // 构建的页面信息


    this.pageContentHeight = 0;
}

printjs.prototype.init = function() {
    this.calcSize();

    this.parseHtml();
    this.buildPage();
    this.generatePage();
}

printjs.prototype.calcSize = function() {
    function getStyle(property, ele) {
        return getComputedStyle(ele)[property];
    }

    // 获取内容高度
    let ele = Array.from(this.container.children).find(item => item.className.includes('page'));
    let pt = getStyle('paddingTop', ele), pb = getStyle('paddingBottom', ele), height = getStyle('height', ele);
    this.pageContentHeight = parseFloat(height) - parseFloat(pt) - parseFloat(pb);
    console.log('内容高度：',this.pageContentHeight);
}

printjs.prototype.parseHtml = function () {
    this.pageNodes = Array.from(this.container.children).filter(item => item.className.includes('page'));
    this.container.innerHTML = '';
}

printjs.prototype.buildPage = function () {
    this.pageNodes.forEach(pageNode => {
        if (pageNode.children.length <= 1) {
            if (pageNode.children[0].tagName === 'TABLE') {
                this.pages = this.pages.concat(this.checkTablePage(this.createPage(pageNode), pageNode.children[0]));
            } else {
                this.pages.push(this.createPage(pageNode, pageNode.children));
            }
            
        } else {
            let children = [];
            Array.from(pageNode.children).forEach(childrenNode => {
                // 如果增加子节点后还没超出，就叠加进去
                if (this.checkPage([...children, childrenNode])) {
                    children.push(childrenNode);
                } else {
                    // 当表格放不下时，单独处理表格
                    if (childrenNode.tagName === 'TABLE') {
                        const tablePages = this.checkTablePage(this.createPage(pageNode, children), childrenNode);
                        if (tablePages.length > 1) {
                            // 超出一个页面时，最后一个页面不塞进去，把最后一个页面的子元素塞到队列里
                            this.pages = [...this.pages, ...(tablePages.slice(0, tablePages.length - 1))];
                            children = [...Array.from(tablePages.at(-1).children)];
                        } else {
                            this.pages = [...this.pages, tablePages[0]];
                            // 清空元素队列
                            children = [];
                        }
                    } else {
                        // 如果超出，则将之前的存入页面，然后开始创建新的页面
                        this.pages.push(this.createPage(pageNode, children));

                        // 将当前节点放入下一个页面队列
                        children = [childrenNode];
                    }

                }
            });
            if(children.length) {
                this.pages.push(this.createPage(pageNode, children));
            }
        }
    });
}

printjs.prototype.generatePage = function () {
    this.pages.forEach(page => {
        console.log(page)
        this.container.appendChild(page);
    });
}

printjs.prototype.checkPage = function(nodes = []) {
    let wrapper = document.createElement('div');
    wrapper.style.visibility = 'hidden';
    nodes.forEach(n => wrapper.appendChild(n && n.cloneNode(true)));
    document.body.appendChild(wrapper);

    if (wrapper.scrollHeight > this.pageContentHeight) {
        console.log(nodes)
        document.body.removeChild(wrapper);
        return false;
    }
    document.body.removeChild(wrapper);
    return true;
}

printjs.prototype.createPage = function(node, children = []) {
    let page = document.createElement('div');
    page.className = node.className;
    Array.from(children).map(c => page.appendChild(c));
    return page;
}

printjs.prototype.checkTablePage = function(node, currentTableNode) {
    let tHeadNode = Array.from(currentTableNode.children).find(item => item.tagName === 'THEAD');
    let currentTableBody = Array.from(currentTableNode.children).find(item => item.tagName === 'TBODY');
    const trNodeList = Array.from(currentTableBody.children).filter(item => item.tagName === 'TR');

    // 第一页为了保留 table 之前的元素
    let pages = [], currentPage = node;

    let tableNode,tBodyNode;
    function resetTable() {
        tableNode = currentTableNode.cloneNode();
        tBodyNode = currentTableBody.cloneNode();
        tableNode.appendChild(tHeadNode.cloneNode(true));
        tableNode.appendChild(tBodyNode);
    }
    resetTable();

    trNodeList.forEach(trNode => {
        tBodyNode.appendChild(trNode);
        // 超出的时候就开新的页面
        if (!this.checkPage([...node.children, tableNode])) {
            tBodyNode.removeChild(trNode);
            pages.push(this.createPage(currentPage, [...currentPage.children, tableNode]));

            resetTable();
            tBodyNode.appendChild(trNode);
            currentPage = this.createPage(node, []);
        }
    })
    // 最后收尾
    pages.push(this.createPage(currentPage, [...currentPage.children, tableNode]));
    return pages;
}

window.addEventListener('load', () => {
    let p = new printjs({ 
        container: document.querySelector('.document'),
        pageSize: {
            width: 210 * 3.752,
            height: 297 * 3.752,
        }
    });
    p.init();
})