
// 
 class ElementWrapper {
  constructor(type){
    this.root = document.createElement(type);
  }
  setAttribute(name,value){
    this.root.setAttribute(name, value);
  }
  appendChild(component){
    this.root.appendChild(component.root);
  }
}

export class Component {
  constructor(type){
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
  }
  setAttribute(name,value){
    this.props[name] = value;
  }
  appendChild(component){
    this.children.push(component);
  }
  get root(){
    if(!this._root){
      this._root = this.render().root;
    }
    return this._root;
  }
}

class TextWrapper {
  constructor(content){
    this.root = document.createTextNode(content);
  }
  setAttribute(name,value){

  }
  appendChild(){
    
  }
}

export function render(component, parentElement){
  parentElement.appendChild(component.root);
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