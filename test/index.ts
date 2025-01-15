import { CompElem, Template, computed, html, prop, query, state, tag, watch } from '../src/index';

const Slogan = ['complete', 'componentize', 'compact', 'companion']

@tag("page-test")
export class PageTest extends CompElem {
  //////////////////////////////////// props
  @prop arg: any

  @state colorR = Math.random() * 255 % 255 >> 0;
  @state colorG = Math.random() * 255 % 255 >> 0;
  @state colorB = Math.random() * 255 % 255 >> 0;
  @state rotation = 0
  @state test = { a: 1 }

  //////////////////////////////////// computed
  @computed
  get color() {
    return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}));`
  }

  //////////////////////////////////// watch
  @watch('rotation')
  function(nv: number) {
    // console.log(nv)
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
    return [
      () => `h2,p,i,h3{
        background-image:${this.color};
      }`,
      () => `h2,p,i,h3{
        filter:hue-rotate(${this.rotation}deg);
      }`,
    ]
  }

  @query('i[name="text"]')
  text: HTMLElement
  sloganIndex = 0

  //////////////////////////////////// lifecycles
  mounted(): void {
    setInterval(() => {
      this.rotation += 1
    }, 24);

    setInterval(() => {
      this.text.classList.add('hide')
      setTimeout(() => {
        this.text.innerHTML = Slogan[this.sloganIndex % 4]
        this.sloganIndex++
        this.text.classList.remove('hide')
      }, 500);
    }, 5000);
  }
  render(): Template {
    return html`<div>
            <i>Welcome to</i>
            <br>
            <h2>CompElem</h2>
            <br>
            <i>A modern, reactive, fast and lightweight library</i>
            <br>
            <i>for building</i>
            <h3>Web Components</h3>
            <p>
              &lt;c-element&gt; <i name="text">...</i> &lt;/c-element&gt;
            </p>
            ${this.arg}
        </div>`
  }
}