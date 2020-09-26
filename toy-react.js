
// symbol不需要new，没有private field之前最好的方案是用symbol
const RENDER_TO_DOM = Symbol("render to dom");
// 
 class ElementWrapper {
  constructor(type){
    this.root = document.createElement(type);
  }
  setAttribute(name,value){
    // 过滤以on开头的属性
    // 用了正则表达式， \s和\S一个所有的空白，一个是所有的非空白
    // [\s\S]这是正则里面用来表示所有字符的一个比较稳妥的方式
    // 
    if(name.match(/^on([\s\S]+)/)){
      // 上面的正则加了括号，下面的RegExp.$1就可以提取到对应的值
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
    }else{
      this.root.setAttribute(name, value);
    }
  }
  appendChild(component){
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }
  [RENDER_TO_DOM](range){
    range.deleteContents();
    range.insertNode(this.root);
  }
}

class TextWrapper {
  constructor(content){
    this.root = document.createTextNode(content);
  }
  [RENDER_TO_DOM](range){
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export class Component {
  constructor(type){
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  setAttribute(name,value){
    this.props[name] = value;
  }
  appendChild(component){
    this.children.push(component);
  }
  // 私有方法
  // rangeAPI 和 位置相关
  // domAPI里面和位置相关的是range
  [RENDER_TO_DOM](range){
    this._range = range;
    this.render()[RENDER_TO_DOM](range);
  }

  // 写一个重新绘制的方法
  rerender(){
    // console.log("rerender--执行",this._range);
    this._range.deleteContents();
    this[RENDER_TO_DOM](this._range);
  }
  // 实现setState的方法
  setState(newState){
    // 加入state不存在，直接赋值，这是一个短路逻辑
    if(this.state === null || typeof this.state !== 'object'){
      this.state = newState;
      this.rerender();
      return;
    }
    let merge = (oldState, newState) => {
      for(let p in newState){
        if(oldState[p] === null || typeof newState[p] !== 'object' ){
          oldState[p] = newState[p];
        }else{
          // 剩下这种情况，说明newState[p]是一个object
          // 所以要执行深拷贝
          merge(oldState[p], newState[p]);
        }
      }
    }
    merge(this.state, newState);
    this.rerender();
  }
}



export function render(component, parentElement){
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}

export function createElement(type, attributes, ...children){
  // type可能是字符串，也可能是类
  let e;
  if(typeof type === 'string'){
    e = new ElementWrapper(type);
  }else{
    e = new type;
  }
  for(let p in attributes){
    e.setAttribute(p, attributes[p]);
  }
  let insertChildren = (children)=>{
    for(let child of children){
      if(typeof child === 'string'){
        child = new TextWrapper(child);
      }
      if(typeof child === 'object' && child instanceof Array){
        insertChildren(child);
      }else{
        e.appendChild(child)
      }
    }
  }
  insertChildren(children);
  return e;
}