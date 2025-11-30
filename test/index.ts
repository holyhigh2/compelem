import { CompElem, Template, computed, forEach, html, prop, query, state, tag, watch } from '../src/index';


import './testComp';
@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props
  @prop arg = ''

  @state colorR = Math.random() * 255 % 255 >> 0;
  @state colorG = Math.random() * 255 % 255 >> 0;
  @state colorB = Math.random() * 255 % 255 >> 0;
  @state rotation = 0
  @state({ shallow: false }) test: Record<string, any> = { a: 1 }
  @state ary = [1, 2, 3, 4, 56, 34, 323, 88, 23, 45, 67, 89, 12, 78, 90]

  //////////////////////////////////// computed
  @computed
  get color() {
    console.log('computed......')
    return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}));`
  }

  //////////////////////////////////// watch
  @watch('test', { deep: true })
  function(nv: Record<string, any>) {
    console.log('父组件变更...', nv)
  }

  //////////////////////////////////// styles
  //静态样式
  static get styles(): Array<string | CSSStyleSheet> {
    return [`:host{
        font-size:16px;
        background:gray;
      }
      i[name="text"]{
        transition: width .3s;
        display: inline-block;
        width: 10rem;
        text-align: center;
        transform-origin: center;
      }
      i[name="text"].hide{
        width:0;
      }
      div,i{
        font-size:1.75rem !important;
        font-family: system-ui;
        text-align:center;
      }
      h2{
        font-size:3rem !important;
        display:inline-block;
        color:#fff;
        background:blue !important;
      }
      p,i,h3{
        color: transparent;
      }
      h2,p,i,h3{
        font-size:2rem;
        background-clip: text;
        transition:all .3s;
      }`];
  }
  //动态样式
  get styles() {
    // console.log('styles......')
    return [
      () => {
        console.log('styles......color')
        return `h2,p,i,h3{
        background-image:${this.color};
      }`
      },
      () => {
        console.log('styles......rotation')
        return `h2,p,i,h3{
        filter:hue-rotate(${this.rotation}deg);
      }`
      },
    ]
  }

  @query('i[name="text"]')
  text: HTMLElement = null!
  sloganIndex = 0

  //////////////////////////////////// lifecycles
  updated(changed: Record<string, any>): void {
    // console.log('updated......')
  }
  mounted(): void {
    console.warn('starting to change...')
    this.rotation = 1
    this.rotation = 2
    this.rotation = 3

    this.colorR = 111
    this.colorG = 222
    this.colorB = 11

    this.rotation = 12
    this.nextTick(() => {
      console.log('nextTick......')
    });
    setInterval(() => {
      // this.rotation++
    }, 100);

    setInterval(() => {
      // this.test.a++
    }, 1000);

    (window as any).xx = this

    // setInterval(() => {
    //   this.text.classList.add('hide')
    //   setTimeout(() => {
    //     this.text.innerHTML = Slogan[this.sloganIndex % 4]
    //     this.sloganIndex++
    //     this.text.classList.remove('hide')
    //   }, 500);
    // }, 5000);
  }
  render(): Template {
    console.log('父组件视图......')
    return html`<div>
            <h2>父组件 ${JSON.stringify(this.test)}</h2>
            <TestComp .childData="${this.test}"></TestComp>
            <button @click="${this.changeTest}">修改父组件并更新子组件</button>
            <button @click="${this.changeTest2}">新增父组件属性并更新子组件</button>
<button @click="${this.changeFor}">更新for</button>
            ${forEach(this.ary, (item: any) => html`<span key="${item}">${item}, </span>`)}
        </div>`
  }
  changeTest() {
    this.test.a = Math.random() * 100 >> 0
  }
  changeTest2() {
    this.test.b = Math.random() * 100 >> 0
  }
  changeFor() {
    this.ary = []
    setTimeout(() => {
      this.ary.push(1)
      this.ary.push(2)
      this.ary.push(3)
      this.ary.push(4)
      this.ary.push(5)
    }, 100);
    // this.ary = [1, 2, 3, 4, 5]
  }
}