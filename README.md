# printjs

## Use
DOM 结构中以 `.page` 作为页面
```
<div class="document">
    <div class="page">
        page 内容
    </div>
</div>
```

然后调用 `printjs` 执行自动格式化
```
<script>
    let p = new printjs({
        container: document.querySelector('.document'),
        injectCallback:  ({ pageNum, totalPage, pageNode }) => {
            const title = pageNode.getAttribute('data-title');
            return `
                ${title ? `<div style="text-align: center; position: absolute;  width: 100%; top: 3mm; left:0; color: gray; font-size: 12px; border-bottom: 1px solid #ccc; ">${title}</div>` : ''}
                <div style="text-align: center; position: absolute;  width: 100%; bottom: 3mm; left:0; color: gray; font-size: 12px;">${pageNum}/${totalPage}</div>`
        }
    });
    p.init();
</script>
```