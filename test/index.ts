import { CompElem, Template, bind, computed, forEach, html, model, prop, query, state, tag, watch } from '../src/index';

const Slogan = ['complete', 'componentize', 'compact', 'companion']

class A {

}

@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props
  @prop arg = ''

  @state colorR = Math.random() * 255 % 255 >> 0;
  @state colorG = Math.random() * 255 % 255 >> 0;
  @state colorB = Math.random() * 255 % 255 >> 0;
  @state rotation = 0
  @state({ shallow: false }) test = { a: 1 }
  @state ary = [1, 2, 3, 4, 56, 234, 23, 423, 4, 234, 234]

  //////////////////////////////////// computed
  @computed
  get color() {
    console.log('computed......')
    return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}));`
  }

  //////////////////////////////////// watch
  @watch('rotation')
  function(ov: number, nv: number, src: string) {
    // console.log('watch...', ov, nv, src)
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
  text: HTMLElement
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
    console.log('render......')
    return html`<div>
            <i>Welcome to</i>
            <br>
            <h2>CompElem</h2>
            <br>
            <i>A modern, reactive, fast and lightweight library</i>
            <br>
            <i>for building</i>
            <h3>Web Components</h3>
            ${forEach(this.ary, (v, i) => html`<div key="${i}">第${i}行 value:${v} -- ${this.test.a}</div>`)}
            <p>
              &lt;c-element&gt; <i ${bind({ a: 'a', x: this.test.a })} name="text">...</i> &lt;/c-element&gt;
            </p>
            <input type="checkbox" ${model(this.test.a)}>
            <input type="text" ${model(this.test.a)}>
            ${this.arg}
        </div>`
  }
}