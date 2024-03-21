/**  
 * 打印指定节点内容的功能函数（目前可以对列表和普通无跨行表格自动分页） 
 * 
 * @example
 * <div class='document' ><div class=".page"></div></div>
 * <script>
 *  new printjs({container: document.querySelector('.document')}).init();
 * </script>
 *  
 * @param {Object} options - 打印选项对象  
 * @param {HTMLElement} options.container - 需要处理的 HTML 节点  
 * @param {string} [options.size='A4'] - 要打印的页面大小（默认为 'A4'）  
 * @param {function} options.injectCallback - 注入页面时的回调函数，返回的 HTML 字符串将注入到页面中  
 * @param {number} options.injectCallback.pageNum - 当前打印的页码  
 * @param {number} options.injectCallback.totalPage - 总共需要打印的页数  
 * @param {HTMLElement} options.injectCallback.pageNode - 当前打印页面的 HTML 元素  
 */
function printjs({ container, size = 'A4', injectCallback }) {
    this.container = container;
    if (!container.id) {
        container.id = 'id-' + Math.random().toString().substring(2);
    }
    this.containerId = container.id;
    

    this.pageNodes = []; // 页面节点
    this.pages = []; // 构建的页面信息


    this.pageContentHeight = 0; // 页面内容区域高度

    this.pageSize = {};
    if (size === 'A4') {
        this.pageSize = { width: '210mm', height: '297mm' };
    }

    if (injectCallback) {
        this.injectCallback = injectCallback;
    }
}

printjs.prototype.init = function() {
    this.injectStyle();
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

printjs.prototype.injectStyle = function() {
    const style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.appendChild(document.createTextNode(`
        #${this.containerId} {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #${this.containerId} .page {
            background-color: #FFF;
            width: ${this.pageSize.width};
            height: ${this.pageSize.height};
            margin: 0 auto;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            overflow: hidden;
            box-sizing: border-box;
            position: relative;
        }

        @page {
            size: ${this.pageSize.width} ${this.pageSize.height};
            margin: 0;
        }

        @media print {
            #${this.containerId} {
                gap: 0;
            }
        }
    `));
    (document.querySelector('head') || document.querySelector('body')).appendChild(style);
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
    this.pages.forEach((page, index) => {
        if (this.injectCallback){
            const res = this.injectCallback({ pageNum: index + 1, totalPage: this.pages.length, pageNode: page });
            if (res !== undefined && res !== null) {
                page.innerHTML += res;
            }
        }
    
        this.container.appendChild(page);
    });
}

printjs.prototype.checkPage = function(nodes = []) {
    let wrapper = document.createElement('div');
    wrapper.style.visibility = 'hidden';
    nodes.forEach(n => wrapper.appendChild(n && n.cloneNode(true)));
    document.body.appendChild(wrapper);

    if (wrapper.scrollHeight > this.pageContentHeight) {
        document.body.removeChild(wrapper);
        return false;
    }
    document.body.removeChild(wrapper);
    return true;
}

printjs.prototype.createPage = function(node, children = []) {
    let page = node.cloneNode();
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