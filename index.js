function printjs({ container, pageSize = { width: 0, height: 0 } }) {
    this.pageSize = pageSize;
    this.container = container;

    this.pageNodes = []; // 页面节点
    this.pages = []; // 构建的页面信息
}

printjs.prototype.init = function() {
    this.parseHtml();
    this.buildPage();
    this.generatePage();
}

printjs.prototype.parseHtml = function () {
    this.pageNodes = Array.from(this.container.children).filter(item => item.className.includes('page'));
    this.container.innerHTML = '';
}

printjs.prototype.buildPage = function () {
    this.pageNodes.forEach(pageNode => {
        if (pageNode.children.length <= 1) {
            this.pages.push(this.createPage(pageNode, pageNode.children));
        } else {
            let children = [];
            Array.from(pageNode.children).forEach(childrenNode => {
                // 如果增加子节点后还没超出，就叠加进去
                if (this.checkPage([...children, childrenNode])) {
                    children.push(childrenNode);
                } else {
                    // 如果超出，则将之前的存入页面，然后开始创建新的页面
                    this.pages.push(this.createPage(pageNode, children));

                    children = [childrenNode];
                }
            });
            this.pages.push(this.createPage(pageNode, children));
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
    nodes.forEach(n => wrapper.appendChild(n));
    document.body.appendChild(wrapper);

    if (wrapper.scrollHeight > this.pageSize.height) {
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