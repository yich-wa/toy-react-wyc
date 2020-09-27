
// symbol不需要new，没有private field之前最好的方案是用symbol
const RENDER_TO_DOM = Symbol("render to dom");



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
  get vdom(){
    return this.render().vdom;
  }
  // get vchildren(){
  //   return this.children.map(child => child.vdom);
  // }
  // 私有方法
  // rangeAPI 和 位置相关
  // domAPI里面和位置相关的是range
  [RENDER_TO_DOM](range){
    this._range = range;
    // 将之前的dom存起来
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }
  update(){
    let isSameNode = (oldNode, newNode) => {
      // 类型不同
      if(oldNode.type !== newNode.type){
        return false;
      }
      // 属性不同
      for( let name in newNode.props){
        if(newNode.props[name]!==oldNode.props[name]){
          return false;
        }
      }
      // 长度不同
      if(Object.keys(oldNode.props).length > Object.keys(newNode.props).length){
        return false;
      }
      // 内容不同
      if(newNode.type === "#text"){
        if(newNode.content !== oldNode.content){
          return false;
        }
      }
      return true;
    }
    let update = (oldNode, newNode) => {
      // type,
      // props 打props
      // children
      // 对比根节点是否一致，对比children是否一致
      if(!isSameNode(oldNode, newNode)){
        // 不一样，重新渲染
        newNode[RENDER_TO_DOM](oldNode._range)
        return;
      }
      // 新旧数量一样，重新设置
      newNode._range = oldNode._range;
      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      if(!newChildren || !newChildren.length){
        return;
      }
      let tailRange = oldChildren[oldChildren.length-1]._range;

      for( let i = 0;i<newChildren.length;i++){
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if(i < oldChildren.length){
          update(oldChild, newChild);
        }else{
          // todo
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    }
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom;
  }

  /*
  // 写一个重新绘制的方法
  rerender(){
    // console.log("rerender--执行",this._range);
    // 先插入，再删除，这样就不会为空了
    // 一，保存老的range
    let oldRange = this._range;
    // 二，新建一个range，复制老的range
    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset)
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);

    // 三，把老的range放在后面，然后删除
    oldRange.setStart(range.endContainer,range.endOffset)
    oldRange.deleteContents();
  }
  */
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
        if(oldState[p] === null || typeof oldState[p] !== 'object' ){
          oldState[p] = newState[p];
        }else{
          // 剩下这种情况，说明newState[p]是一个object
          // 所以要执行深拷贝
          merge(oldState[p], newState[p]);
        }
      }
    }
    merge(this.state, newState);
    this.update();
  }
}


// 
 class ElementWrapper extends Component {
  constructor(type){
    super(type);
    this.type = type;
    this.root = document.createElement(type);
  }
  /*
  // 实质是存this.props
  setAttribute(name,value){
    
  }
  // 实质是存this.children
  appendChild(component){
   
  }
  */
  // 独立实现一个虚拟dom的一个方法
  get vdom(){
    this.vchildren = this.children.map(child => child.vdom);
    return this;
    /*
    {
      type: this.type,
      props: this.props,
      // 从组件的children变成vdom的children
      // 递归调用
      children: this.children.map(child => child.vdom )
    }
    */
  }
  
  [RENDER_TO_DOM](range){
    this._range = range;
    let root = document.createElement(this.type);
    for(let name in this.props){
      // 过滤以on开头的属性
      // 用了正则表达式， \s和\S一个所有的空白，一个是所有的非空白
      // [\s\S]这是正则里面用来表示所有字符的一个比较稳妥的方式
      // 
      let value = this.props[name];
      if(name.match(/^on([\s\S]+)/)){
        // 上面的正则加了括号，下面的RegExp.$1就可以提取到对应的值
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
      }else{
        if(name === "className"){
          root.setAttribute("class",value);
        }else{
          root.setAttribute(name, value);
        }
      }
    }
    // 避免一部分麻烦
    if(!this.vchildren){
      this.vchildren = this.children.map(child => child.vdom);
    }
    for(let child of this.vchildren){
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }
    replaceContent(range, root);

  }
}

class TextWrapper extends Component {
  constructor(content){
    super(content);
    this.text = "#text";
    this.content = content;
  }
  get vdom(){
    return this;
  }

  [RENDER_TO_DOM](range){
    this._range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

function replaceContent(range, node){
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();
  range.setStartBefore(node);
  range.setEndAfter(node);
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
      if(child === null){
        continue;
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

export function render(component, parentElement){
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}