
const ul = document.querySelector('ul');


async function getList() {
    let res = await fetch('/api/list');
    let data = await res.json();
    let str = '';
    data.forEach(link=>{
        str+=`<li><img src="${link}"></li>`
    })
    ul.innerHTML = str;
}

getList();