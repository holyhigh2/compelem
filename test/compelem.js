/* compelem 0.6.13-b1 @holyhigh2 https://github.com/holyhigh2/compelem */
(function (l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.compelem = {}));
})(this, (function (exports) {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    /**
       * myfx v1.13.4
       * A modular utility library with more utils, higher performance and simpler declarations ...
       * https://github.com/holyhigh2/myfx
       * (c) 2021-2025 @holyhigh2 may be freely distributed under the MIT license
       */
    /**
   * 判断参数是否为Array对象的实例
   *
   * @example
   * //true
   * console.log(_.isArray([]))
   * //false
   * console.log(_.isArray(document.body.children))
   *
   * @param v
   * @returns
   */
    function isArray(v) {
        return Array.isArray(v);
    }

    /**
     * 判断参数是否为函数对象
     *
     * @example
     * //true
     * console.log(_.isFunction(new Function()))
     * //true
     * console.log(_.isFunction(()=>{}))
     *
     * @param v
     * @returns
     */
    function isFunction(v) {
        return v instanceof Function || typeof v == 'function';
    }

    /**
     * 内部使用类型
     *
     * @packageDocumentation
     */
    const PRIMITIVE_TYPES = [
        'string',
        'number',
        'bigint',
        'boolean',
        'undefined',
        'symbol',
    ];

    /**
     * 判断值是不是一个非基本类型外的值，如果true则认为值是一个对象
     * 同样，该方法还可以用来判断一个值是不是基本类型
     *
     * @example
     * //false
     * console.log(_.isObject(1))
     * //true
     * console.log(_.isObject(new String()))
     * //false
     * console.log(_.isObject(true))
     * //false
     * console.log(_.isObject(null))
     *
     * @param v value
     * @returns 是否对象。如果值是null返回false，即使typeof null === 'object'
     */
    function isObject(v) {
        return null !== v && PRIMITIVE_TYPES.indexOf(typeof v) < 0;
    }

    /**
     * 判断参数是否为字符串，包括String类的实例以及基本类型string的值
     *
     * @example
     * //true
     * console.log(_.isString(new String('')))
     * //true
     * console.log(_.isString(''))
     *
     * @param v
     * @returns
     */
    function isString(v) {
        return v instanceof String || Object.prototype.toString.call(v) === '[object String]';
    }

    /**
     * 判断参数是否为类数组对象
     *
     * @example
     * //true
     * console.log(_.isArrayLike('abc123'))
     * //true
     * console.log(_.isArrayLike([]))
     * //true
     * console.log(_.isArrayLike(document.body.children))
     *
     * @param v
     * @returns
     */
    function isArrayLike(v) {
        if (isString(v) && v.length > 0)
            return true;
        if (!isObject(v))
            return false;
        // 具有length属性
        const list = v;
        if ('length' in list) {
            const proto = Reflect.getPrototypeOf(list);
            // NodeList/HTMLCollection/CSSRuleList/...
            if (isFunction(proto?.item))
                return true;
            // arguments
            if (isFunction(list[Symbol.iterator]))
                return true;
        }
        return false;
    }

    /**
     * 判断值是不是迭代器对象
     *
     * @example
     * //true
     * console.log(_.isIterator(new Map()))
     * //true
     * console.log(_.isIterator(new Map().values()))
     * //false
     * console.log(_.isIterator({a:1}))
     *
     * @param v
     * @returns
     * @since 1.10.0
     */
    function isIterator(v) {
        return typeof v === 'object' && v !== null && Symbol.iterator in v;
    }

    /**
     * 判断值是不是一个Map对象
     *
     * @example
     * //true
     * console.log(_.isMap(new Map()))
     * //false
     * console.log(_.isMap(new WeakMap()))
     *
     * @param v
     * @returns
     */
    function isMap(v) {
        return v instanceof Map || Object.prototype.toString.call(v) === '[object Map]';
    }

    /**
     * 判断值是不是一个Set对象
     *
     * @example
     * //false
     * console.log(_.isSet(new WeakSet))
     * //true
     * console.log(_.isSet(new Set))
     *
     * @param v
     * @returns
     */
    function isSet(v) {
        return v instanceof Set || Object.prototype.toString.call(v) === '[object Set]';
    }

    function keys(obj) {
        if (obj === null || obj === undefined)
            return [];
        if (isMap(obj)) {
            return Array.from(obj.keys());
        }
        return Object.keys(obj);
    }

    /**
     * 返回对象/Map的所有value数组
     * <div class="alert alert-secondary">
          只返回对象的自身可枚举属性
        </div>
     *
     *
     * @example
     * let f = new Function("this.a=1;this.b=2;");
     * f.prototype.c = 3;
     * //[1,2]
     * console.log(_.values(new f()))
     *
     * @param obj
     * @returns 值列表
     */
    function values(obj) {
        if (isMap(obj)) {
            return Array.from(obj.values());
        }
        return keys(obj).map((k) => obj[k]);
    }

    /**
     * 把一个集合对象转为array对象。对于非集合对象，
     * <ul>
     * <li>字符串 - 每个字符都会变成数组的元素</li>
     * <li>其他情况 - 返回包含一个collection元素的数组</li>
     * </ul>
     *
     * @example
     * //[1,2,3]
     * console.log(_.toArray(new Set([1,2,3])))
     * //['a','b','c']
     * console.log(_.toArray('abc'))
     * //[1,2,'b']
     * console.log(_.toArray({x:1,y:2,z:'b'}))
     * //[[1, 'a'], [3, 'b'], ['a', 5]]
     * console.log(_.toArray(new Map([[1,'a'],[3,'b'],['a',5]])))
     * //[1, 3, 'a']
     * console.log(_.toArray(new Map([[1,'a'],[3,'b'],['a',5]])).keys())
     *
     * @param collection 如果是Map/Object对象会转换为值列表
     *
     * @returns 转换后的数组对象
     */
    function toArray(collection) {
        if (isArray(collection))
            return collection.concat();
        if (isFunction(collection))
            return [collection];
        if (isSet(collection)) {
            return Array.from(collection);
        }
        else if (isString(collection)) {
            return collection.split('');
        }
        else if (isArrayLike(collection)) {
            return Array.from(collection);
        }
        else if (isMap(collection)) {
            return Array.from(collection.values());
        }
        else if (isIterator(collection)) {
            return Array.from(collection);
        }
        else if (isObject(collection)) {
            return values(collection);
        }
        return [collection];
    }

    /**
     * 向数组末尾追加一个或多个元素并返回
     *
     * > 该函数会修改原数组
     *
     * @example
     * //[1, 2, 3, 4]
     * let ary = [1,2];
     * _.append(ary,3,4);
     * console.log(ary);
     * //[1, 2, Array(2), 5]
     * ary = [1,2];
     * _.append(ary,[3,4],5);
     * console.log(ary);
     * //[1, 2, 3, 4]
     * ary = [1,2];
     * _.append(ary,...[3,4]);
     * console.log(ary);
     *
     * @param array 数组对象。如果非数组类型会自动转为数组
     * @param values 1-n个需要插入列表的值
     * @returns 插入值后的数组对象
     */
    function append(array, ...values) {
        const rs = isArray(array) ? array : toArray(array);
        rs.push(...values);
        return rs;
    }

    /**
     * 把指定数组拆分成多个长度为size的子数组，并返回子数组组成的二维数组
     * @example
     * //[[1,2],[3,4]]
     * console.log(_.chunk([1,2,3,4],2))
     * //[[1,2,3],[4]]
     * console.log(_.chunk([1,2,3,4],3))
     *
     * @param array 数组，非数组返回空数组
     * @param [size=1] 子数组长度
     * @returns 拆分后的新数组
     * @since 0.23.0
     */
    function chunk(array, size = 1) {
        const rs = [];
        if (!Array.isArray(array))
            return rs;
        const sizeNum = (size || 1) >> 0;
        array.forEach((v, i) => {
            if (i % sizeNum == 0) {
                rs.push(array.slice(i, i + sizeNum));
            }
        });
        return rs;
    }

    function identity(v) {
        return v;
    }

    /**
     * 对集合内的假值进行剔除，并返回剔除后的新数组。假值包括 null/undefined/NaN/0/''/false
     * @example
     * //[1,2,4,'a','1']
     * console.log(_.compact([0,1,false,2,4,undefined,'a','1','',null]))
     *
     * @param array 数组
     * @returns 转换后的新数组对象
     */
    function compact(array) {
        return toArray(array).filter(identity);
    }

    function each(collection, callback) {
        let values;
        let keys;
        if (isString(collection) || isArrayLike(collection)) {
            let size = collection.length;
            for (let i = 0; i < size; i++) {
                const r = callback(collection[i], i, collection);
                if (r === false)
                    return;
            }
        }
        else if (isSet(collection)) {
            let size = collection.size;
            values = collection.values();
            for (let i = 0; i < size; i++) {
                const r = callback(values.next().value, i, collection);
                if (r === false)
                    return;
            }
        }
        else if (isMap(collection)) {
            let size = collection.size;
            keys = collection.keys();
            values = collection.values();
            for (let i = 0; i < size; i++) {
                const r = callback(values.next().value, keys.next().value, collection);
                if (r === false)
                    return;
            }
        }
        else if (isObject(collection)) {
            keys = Object.keys(collection);
            let size = keys.length;
            for (let i = 0; i < size; i++) {
                const k = keys[i];
                const r = callback(collection[k], k, collection);
                if (r === false)
                    return;
            }
        }
    }

    /**
     * 合并数组或值并返回新数组，元素可以重复。基于 `Array.prototype.concat` 实现
     *
     * @example
     * //[a/b/a]
     * console.log(_.concat([{name:'a'},{name:'b'}],[{name:'a'}]))
     * //[1, 2, 3, 1, 2]
     * console.log(_.concat([1,2,3],[1,2]))
     * //[1, 2, 3, 1, 2, null, 0]
     * console.log(_.concat([1,2,3],[1,2],null,0))
     * //[1, 2, 3, 1, 2, doms..., 0, null]
     * console.log(_.concat([1,2,3],[1,2],document.body.children,0,null))
     *
     * @param arrays 1-n个数组对象
     * @returns 如果参数为空，返回空数组
     */
    function concat(...arrays) {
        if (arrays.length < 1)
            return [];
        let rs = [];
        for (let i = 0; i < arrays.length; i++) {
            const item = arrays[i];
            if (isArrayLike(item)) {
                each(item, (v) => rs.push(v));
            }
            else {
                rs.push(item);
            }
        }
        return rs;
    }

    /**
     * 对所有集合做差集并返回差集元素组成的新数组
     *
     * @example
     * //[1]
     * console.log(_.except([1,2,3],[2,3]))
     * //[1,4]
     * console.log(_.except([1,2,3],[2,3],[3,2,1,4]))
     * //[{name: "b"}]
     * console.log(_.except([{name:'a'},{name:'b'}],[{name:'a'}],v=>v.name))
     * //[2, 3, "2", "3"] '2'和2不相等
     * console.log(_.except([1,2,3],[1,'2',3],[2,'3',1]))
     *
     * @param params (...arrays[,identifier(v)])
     * arrays - 1-n个数组或arraylike对象，非arraylike参数会被忽略;
     * identifier - 标识函数，用来对每个元素返回唯一标识，标识相同的值会认为相等。使用<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Same-value-zero_equality">SameValueZero</a> 算法进行值比较。如果为空，直接使用值自身比较
     * @returns 差集元素组成的新数组
     */
    function except(...params) {
        let comparator;
        let list = params;
        const sl = params.length;
        if (sl > 2) {
            const lp = params[sl - 1];
            if (isFunction(lp)) {
                comparator = lp;
                list = params.slice(0, params.length - 1);
            }
        }
        list = list.filter((v) => isArrayLike(v) || isArray(v));
        if (list.length < 1)
            return list;
        const len = list.length;
        const kvMap = new Map();
        // 遍历所有元素
        for (let j = 0; j < len; j++) {
            const ary = list[j];
            const localMap = new Map();
            for (let i = 0; i < ary.length; i++) {
                const v = ary[i];
                const id = comparator ? comparator(v) : v;
                if (!kvMap.get(id)) {
                    // 防止组内重复
                    kvMap.set(id, { i: 0, v: v });
                }
                if (kvMap.get(id) && !localMap.get(id)) {
                    kvMap.get(id).i++;
                    // 相同id本组内不再匹配
                    localMap.set(id, true);
                }
            }
        }
        const rs = [];
        each(kvMap, (v) => {
            if (v.i < len) {
                rs.push(v.v);
            }
        });
        return rs;
    }

    /**
     * 使用固定值填充arrayLike中从起始索引到终止索引内的全部元素
     *
     * @example
     * //[6, 6, 6]
     * console.log(_.fill(new Array(3), 6))
     * //[1, 'x', 'x', 'x', 5]
     * console.log(_.fill([1, 2, 3, 4, 5], 'x', 1, 4))
     *
     * @param array 数组
     * @param value 填充值
     * @param [start=0] 起始索引，包含
     * @param [end] 终止索引，不包含
     * @returns 填充后的新数组
     */
    function fill(array, value, start = 0, end) {
        const rs = toArray(array);
        rs.fill(value, start, end);
        return rs;
    }

    /**
     * 判断参数是否为undefined
     * @example
     * //true
     * console.log(_.isUndefined(undefined))
     * //false
     * console.log(_.isUndefined(null))
     *
     * @param v
     * @returns
     */
    function isUndefined(v) {
        return v === undefined;
    }

    function toPath$1(path) {
        let chain = path;
        if (isArray(chain)) {
            chain = chain.join('.');
        }
        let rs = chain + '';
        if (rs.includes('[')) {
            rs = rs.replace(/\[(['"])?([^\]'"]+)\1?\]/gm, '.$2');
        }
        if (rs[0] === '.') {
            rs = rs.substring(1);
        }
        return rs.split('.');
    }

    /**
     * 通过path获取对象属性值
     *
     * @example
     * //2
     * console.log(_.get([1,2,3],1))
     * //Holyhigh
     * console.log(_.get({a:{b:[{x:'Holyhigh'}]}},['a','b',0,'x']))
     * //Holyhigh2
     * console.log(_.get({a:{b:[{x:'Holyhigh2'}]}},'a.b.0.x'))
     * //Holyhigh
     * console.log(_.get({a:{b:[{x:'Holyhigh'}]}},'a.b[0].x'))
     * //hi
     * console.log(_.get([[null,[null,null,'hi']]],'[0][1][2]'))
     * //not find
     * console.log(_.get({},'a.b[0].x','not find'))
     *
     * @param obj 需要获取属性值的对象，如果obj不是对象(isObject返回false)，则返回defaultValue
     * @param path 属性路径，可以是索引数字，字符串key，或者多级属性数组
     * @param [defaultValue] 如果path未定义，返回默认值
     * @returns 属性值或默认值
     */
    function get(obj, path, defaultValue) {
        if (!isObject(obj))
            return defaultValue;
        if (!isArray(path) || (path.length === 1 && (path = path[0]) !== undefined)) {
            let v = obj[path];
            if (v !== undefined)
                return v;
        }
        const chain = toPath$1(path);
        let target = obj;
        for (let i = 0; i < chain.length; i++) {
            const seg = chain[i];
            target = target[seg];
            if (!target)
                break;
        }
        if (target === undefined)
            target = defaultValue;
        return target;
    }

    /**
     * 创建一个函数，该函数返回指定对象的path属性值
     * @example
     * const libs = [
     *  {name:'func.js',platform:['web','nodejs'],tags:{utils:true},js:false},
     *  {name:'juth2',platform:['web','java'],tags:{utils:false,middleware:true},js:true},
     *  {name:'soya2d',platform:['web'],tags:{utils:true},js:true}
     * ];
     * //[true,false,true]
     * console.log(_.map(libs,_.prop('tags.utils')))
     * //nodejs
     * console.log(_.prop(['platform',1])(libs[0]))
     *
     * @param path
     * @returns 接收一个对象作为参数的函数
     * @since 0.17.0
     */
    function prop$1(path) {
        return (obj) => {
            return get(obj, path);
        };
    }

    function eq$1(a, b) {
        return Object.is(a, b);
    }

    /**
     * 判断值是否为null或undefined
     *
     * @example
     * //true
     * console.log(_.isNil(undefined))
     * //false
     * console.log(_.isNil(0))
     * //true
     * console.log(_.isNil(null))
     * //false
     * console.log(_.isNil(NaN))
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function isNil(v) {
        return v === null || v === undefined;
    }

    /**
     * 判断值是不是Node的实例
     *
     * @example
     * //true
     * console.log(_.isNode(document.body.attributes[0]))
     * //true
     * console.log(_.isNode(document))
     *
     * @param v
     * @returns
     * @since 1.5.0
     */
    function isNode(v) {
        return typeof v === 'object' && v instanceof (globalThis.Node || Object);
    }

    /**
     * 检测props对象中的所有属性是否在object中存在并使用自定义比较器对属性值进行对比。可以用于对象的深度对比。
     * 当comparator参数是默认值时，与<code>isMath</code>函数相同
     *
     * @example
     * let target = {a:{x:1,y:2},b:1}
     * //true
     * console.log(_.isMatchWith(target,{b:1},_.eq))
     * //false
     * console.log(_.isMatchWith(target,{b:'1'},_.eq))
     *
     * target = {a:null,b:0}
     * //true
     * console.log(_.isMatchWith(target,{a:'',b:'0'},(a,b)=>_.isEmpty(a) && _.isEmpty(b)?true:a==b))
     *
     * @param target 如果不是对象类型，返回false
     * @param props 对比属性对象，如果是nil，返回true
     * @param comparator 比较器。参数(object[k],props[k],k,object,props)，返回true表示匹配
     * @returns 匹配所有props返回true
     * @since 0.18.1
     */
    function isMatchWith(target, props, comparator) {
        if (isNil(props))
            return true;
        const ks = Object.keys(props);
        if (!isObject(target))
            return false;
        let rs = true;
        for (let i = ks.length; i--;) {
            const k = ks[i];
            const v1 = target[k];
            const v2 = props[k];
            if (isObject(v1) && isObject(v2) && !isNode(v1) && !isNode(v2) && !isFunction(v1) && !isFunction(v2)) {
                if (!isMatchWith(v1, v2, comparator)) {
                    rs = false;
                    break;
                }
            }
            else {
                if (!comparator(v1, v2, k, target, props)) {
                    rs = false;
                    break;
                }
            }
        }
        return rs;
    }

    /**
     * 检测props对象中的所有属性是否在object中存在，可用于对象的深度对比。
     * 使用<code>eq</code>作为值对比逻辑
     *
     * @example
     * let target = {a:{x:1,y:2},b:1}
     * //true
     * console.log(_.isMatch(target,{b:1}))
     * //true
     * console.log(_.isMatch(target,{a:{x:1}}))
     *
     * target = [{x:1,y:2},{b:1}]
     * //true
     * console.log(_.isMatch(target,{1:{b:1}}))
     * //true
     * console.log(_.isMatch(target,[{x:1}]))
     *
     * @param object
     * @param props 对比属性对象，如果是null，返回true
     * @returns 匹配所有props返回true
     * @since 0.17.0
     */
    function isMatch(object, props) {
        return isMatchWith(object, props, eq$1);
    }

    /**
     * 创建一个函数，该函数接收一个对象为参数并返回对该对象使用props进行验证的的断言结果。
     *
     *
     * @example
     * const libs = [
     *  {name:'func.js',platform:['web','nodejs'],tags:{utils:true},js:true},
     *  {name:'juth2',platform:['web','java'],tags:{utils:false,middleware:true},js:false},
     *  {name:'soya2d',platform:['web'],tags:{utils:true},js:false}
     * ];
     *
     * //[{func.js...}]
     * console.log(_.filter(libs,_.matcher({tags:{utils:true},js:true})))
     *
     * @param props 断言条件对象
     * @returns matcher(v)函数
     * @since 0.17.0
     */
    function matcher(props) {
        return (obj) => {
            return isMatch(obj, props);
        };
    }

    /**
     * 解析path并返回数组
     * @example
     * //['a', 'b', '2', 'c']
     * console.log(_.toPath('a.b[2].c'))
     * //['a', 'b', 'c', '1']
     * console.log(_.toPath(['a','b','c[1]']))
     * //['1']
     * console.log(_.toPath(1))
     *
     * @param path 属性路径，可以是数字索引，字符串key，或者多级属性数组
     * @returns path数组
     * @since 0.16.0
     */
    function toPath(path) {
        return toPath$1(path);
    }

    function iteratee(value) {
        if (isUndefined(value)) {
            return identity;
        }
        else if (isFunction(value)) {
            return value;
        }
        else if (isString(value)) {
            return prop$1(value);
        }
        else if (isArray(value)) {
            return prop$1(toPath(value));
        }
        else if (isObject(value)) {
            return matcher(value);
        }
        return () => false;
    }

    /**
     * 对集合内的所有元素进行断言并返回第一个匹配的元素索引
     *
     * @example
     * //3 查询数组的索引
     * console.log(_.findIndex(['a','b','c',1,3,6],_.isNumber))
     * //0
     * console.log(_.findIndex([{a:1},{a:2},{a:3}],'a'))
     * //2
     * console.log(_.findIndex([{a:1},{a:2},{a:3}],{a:3}))
     *
     * @param array 数组，非数组返回-1
     * @param predicate (value[,index[,array]]);断言
     * <br>当断言是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils!iteratee}
     * @param fromIndex 从0开始的起始索引，设置该参数可以减少实际遍历次数。默认0
     * @returns 第一个匹配断言的元素索引或-1
     */
    function findIndex(array, predicate, fromIndex) {
        if (!Array.isArray(array))
            return -1;
        let rs = -1;
        let fromIndexNum = fromIndex || 0;
        const itee = iteratee(predicate);
        for (let i = fromIndexNum; i < array.length; i++) {
            const v = array[i];
            const r = itee(v, i, array);
            if (r) {
                rs = i + fromIndexNum;
                break;
            }
        }
        return rs;
    }

    /**
     * 获取集合对象的内容数量，对于map/object对象获取的是键/值对的数量
     *
     * @example
     * //3
     * console.log(_.size({a:1,b:2,c:{x:1}}))
     * //0
     * console.log(_.size(null))
     * //3
     * console.log(_.size(new Set([1,2,3])))
     * //2
     * console.log(_.size([1,[2,[3]]]))
     * //2
     * console.log(_.size(document.body.children))
     * //4
     * console.log(_.size(document.body.childNodes))
     * //3 arguments已不推荐使用，请使用Rest参数
     * console.log((function(){return _.size(arguments)})('a',2,'b'))
     * //7
     * console.log(_.size('func.js'))
     *
     * @param collection
     * @returns 集合长度，对于null/undefined/WeakMap/WeakSet返回0
     */
    function size(collection) {
        if (isNil(collection))
            return 0;
        if ((collection.length))
            return collection.length;
        if (isMap(collection) || isSet(collection))
            return collection.size;
        if (isObject(collection))
            return Object.keys(collection).length;
        return 0;
    }

    /**
     * 对集合内的所有元素进行断言并返回最后一个匹配的元素索引
     *
     * @example
     * //5 查询数组的索引
     * console.log(_.findLastIndex(['a','b','c',1,3,6],_.isNumber))
     * //2
     * console.log(_.findLastIndex([{a:1},{a:2},{a:3}],'a'))
     *
     * @param array 数组，非数组返回-1
     * @param predicate (value[,index[,array]]);断言
     * <br>当断言是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils!iteratee}
     * @param [fromIndex=array.length - 1] 从集合长度-1开始的起始索引。设置该参数可以减少实际遍历次数
     * @returns 最后一个匹配断言的元素索引或-1
     * @since 0.19.0
     */
    function findLastIndex(array, predicate, fromIndex) {
        if (!Array.isArray(array))
            return -1;
        let rs = -1;
        let fromIndexNum = fromIndex ?? size(array) - 1;
        const itee = iteratee(predicate);
        for (let i = fromIndexNum; i >= 0; i--) {
            const v = array[i];
            const r = itee(v, i, array);
            if (r) {
                rs = i;
                break;
            }
        }
        return rs;
    }

    /**
     * 按照指定的嵌套深度递归遍历数组，并将所有元素与子数组中的元素合并为一个新数组返回
     *
     * @example
     * //[1,2,3,4,5]
     * console.log(_.flat([1,[2,3],[4,5]]))
     * //[1,2,3,4,5,[6,7]]
     * console.log(_.flat([1,[2,3],[4,5,[6,7]]]))
     * //[1,2,3,[4]]
     * console.log(_.flat([1,[2,[3,[4]]]],2))
     * //[1,2,1,3,4]
     * console.log(_.flat(new Set([1,1,[2,[1,[3,4]]]]),Infinity))
     *
     * @param array 数组
     * @param [depth=1] 嵌套深度
     * @returns 扁平化后的新数组
     */
    function flat(array, depth = 1) {
        if (depth < 1)
            return array.concat();
        const rs = toArray(array).reduce((acc, val) => {
            return acc.concat(Array.isArray(val) && depth > 0 ? flat(val, depth - 1) : val);
        }, []);
        return rs;
    }

    /**
     * 无限深度遍历数组，并将所有元素与子数组中的元素合并为一个新数组返回
     *
     * @example
     * //[1,2,1,3,4]
     * console.log(_.flatDeep(new Set([1,1,[2,[1,[3,4]]]])))
     * //[1,2,3,4]
     * console.log(_.flatDeep([1,[2,[3,[4]]]]))
     *
     * @param array 数组
     * @returns 扁平化后的新数组
     */
    function flatDeep(array) {
        return flat(array, Infinity);
    }

    /**
     * 判断参数是否为数字类型值
     *
     * @example
     * //true
     * console.log(_.isNumber(1))
     * //true
     * console.log(_.isNumber(Number.MAX_VALUE))
     * //false
     * console.log(_.isNumber('1'))
     *
     * @param v
     * @returns
     */
    function isNumber(v) {
        return v instanceof Number || Object.prototype.toString.call(v) === '[object Number]';
    }

    /**
     * 向数组中指定位置插入一个或多个元素并返回
     *
     * > 该函数会修改原数组
     *
     * @example
     * //[1, 2, Array(1), 'a', 3, 4]
     * let ary = [1,2,3,4];
     * _.insert(ary,2,[1],'a');
     * console.log(ary);
     * //[1, 2, 3, 4]
     * ary = [3,4];
     * _.insert(ary,0,1,2);
     * console.log(ary);
     * //func.js
     * console.log(_.insert('funcjs',4,'.').join(''));
     *
     * @param array 数组对象。如果非数组类型会自动转为数组
     * @param index 插入位置索引，0 - 列表长度
     * @param values 1-n个需要插入列表的值
     * @returns 插入值后的数组对象
     */
    function insert(array, index, ...values) {
        const rs = isArray(array) ? array : toArray(array);
        if (!isNumber(index) || index < 0)
            index = 0;
        rs.splice(index, 0, ...values);
        return rs;
    }

    /**
     * 对所有集合做交集并返回交集元素组成的新数组
     * <p>
     * 关于算法性能可以查看文章<a href="https://www.jianshu.com/p/aa131d573575" target="_holyhigh">《如何实现高性能集合操作(intersect)》</a>
     * </p>
     *
     * @example
     * //[2]
     * console.log(_.intersect([1,2,3],[2,3],[1,2]))
     * //[3]
     * console.log(_.intersect([1,1,2,2,3],[1,2,3,4,4,4],[3,3,3,3,3,3]))
     * //[{name: "a"}] 最后一个参数是函数时作为标识函数
     * console.log(_.intersect([{name:'a'},{name:'b'}],[{name:'a'}],v=>v.name))
     * //[]
     * console.log(_.intersect())
     * //[3] 第三个参数被忽略，然后求交集
     * console.log(_.intersect([1,2,3],[3],undefined))
     * //[1] "2"和2不相同，3和"3"不相同
     * console.log(_.intersect([1,2,3],[1,'2',3],[2,'3',1]))
     *
     * @param params (...arrays[,identifier(v)])
     * arrays - 1-n个数组或arraylike对象，非arraylike参数会被忽略;
     * identifier - 标识函数，用来对每个元素返回唯一标识，标识相同的值会认为相等。使用<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Same-value-zero_equality">SameValueZero</a> 算法进行值比较。如果为空，直接使用值自身比较
     * @returns 交集元素组成的新数组
     */
    function intersect(...params) {
        let comparator;
        let list = params;
        const sl = params.length;
        if (sl > 2) {
            const lp = params[sl - 1];
            if (isFunction(lp)) {
                comparator = lp;
                list = params.slice(0, sl - 1);
            }
        }
        list = list.filter((v) => isArrayLike(v) || isArray(v));
        if (list.length < 1)
            return list;
        const len = list.length;
        // 取得最短集合
        list.sort((a, b) => a.length - b.length);
        const kvMap = new Map();
        // 记录最少id
        let idLength = 0; // 用于快速匹配
        for (let i = list[0].length; i--;) {
            const v = list[0][i];
            const id = comparator ? comparator(v) : v;
            if (!kvMap.get(id)) {
                // 防止组内重复
                kvMap.set(id, { i: 1, v: v });
                idLength++;
            }
        }
        for (let j = 1; j < len; j++) {
            const ary = list[j];
            const localMap = new Map();
            let localMatchedCount = 0;
            for (let i = 0; i < ary.length; i++) {
                const v = ary[i];
                const id = comparator ? comparator(v) : v;
                if (kvMap.get(id) && !localMap.get(id)) {
                    kvMap.get(id).i++;
                    // 相同id本组内不再匹配
                    localMap.set(id, true);
                    // 匹配次数加1
                    localMatchedCount++;
                    // 已经匹配完所有可交集元素，无需继续检查
                    if (localMatchedCount === idLength)
                        break;
                }
            }
        }
        const rs = [];
        each(kvMap, (v) => {
            if (v.i === len) {
                rs.push(v.v);
            }
        });
        return rs;
    }

    /**
     * 把arrayLike中所有元素连接成字符串并返回。对于基本类型元素会直接转为字符值，对象类型会调用toString()方法
     *
     * @example
     * //'1/2/3/4'
     * console.log(_.join([1, 2, 3, 4], '/'))
     * //'1,2,3,4'
     * console.log(_.join([1, 2, 3, 4]))
     *
     * @param array 数组，非数组返回空字符串
     * @param [separator=','] 分隔符
     * @returns 拼接字符串
     */
    function join(array, separator) {
        if (!Array.isArray(array))
            return '';
        return array.join(separator || ',');
    }

    /**
     * 转换任何对象为数字类型
     *
     * @example
     * //NaN
     * console.log(_.toNumber(null))
     * //1
     * console.log(_.toNumber('1'))
     * //NaN
     * console.log(_.toNumber([3,6,9]))
     * //-0
     * console.log(_.toNumber(-0))
     * //NaN
     * console.log(_.toNumber(NaN))
     * //NaN
     * console.log(_.toNumber('123a'))
     *
     * @param v 任何值
     * @returns 对于null/undefined会返回NaN
     */
    function toNumber(v) {
        if (v === undefined || v === null)
            return NaN;
        return Number(v);
    }

    /**
     * 删除数组末尾或指定索引的一个元素并返回被删除的元素
     *
     * > 该函数会修改原数组
     *
     * @example
     * //3, [1, 2]
     * let ary = [1,2,3];
     * console.log(_.pop(ary),ary)
     * //{a: 1}, [{"a":2},{"a":3}]
     * ary = [{a:1},{a:2},{a:3}];
     * console.log(_.pop(ary,0),ary)
     *
     * @param array 数组对象。如果非数组类型会直接返回null
     * @param [index=-1] 要删除元素的索引。默认删除最后一个元素
     * @returns 被删除的值或null
     */
    function pop(array, index) {
        index = index || -1;
        let rs = null;
        if (Array.isArray(array)) {
            const i = toNumber(index);
            if (i > -1) {
                rs = array.splice(i, 1);
                if (rs.length < 1)
                    rs = null;
                else {
                    rs = rs[0];
                }
            }
            else {
                rs = array.pop();
            }
        }
        return rs;
    }

    /**
     * 对数组进行切片，并返回切片后的新数组，原数组不变。新数组内容是对原数组内容的浅拷贝
     *
     * @example
     * //[2,3,4]
     * console.log(_.slice([1,2,3,4,5],1,4))
     * //[2,3,4,5]
     * console.log(_.slice([1,2,3,4,5],1))
     *
     *
     * @param array 数组，非数组返回空数组
     * @param [begin=0] 切片起始下标，包含下标位置元素
     * @param [end] 切片结束下标，<b>不包含</b>下标位置元素
     * @returns 切片元素组成的新数组
     */
    function slice(array, begin, end) {
        if (!Array.isArray(array))
            return [];
        return array.slice(begin || 0, end);
    }

    /**
     * 判断集合中是否包含给定的值。使用<code>eq</code>函数进行等值判断。
     *
     * @example
     * //true
     * console.log(_.includes({a:1,b:2},2))
     * //false
     * console.log(_.includes([1,3,5,7,[2]],2))
     * //true
     * console.log(_.includes([1,3,5,7,[2]],3))
     * //false
     * console.log(_.includes([1,3,5,7,[2]],3,2))
     * //true
     * console.log(_.includes([0,null,undefined,NaN],NaN))
     * //true
     * console.log(_.includes('abcdefg','abc'))
     * //false
     * console.log(_.includes('abcdefg','abc',2))
     * //false
     * console.log(_.includes('aBcDeFg','abc'))
     *
     * @param collection 如果集合是map/object对象，则只对value进行比对
     * @param value
     * @param [fromIndex=0] 从集合的fromIndex 索引处开始查找。如果集合是map/object对象，无效
     * @returns 如果包含返回true否则返回false
     */
    function includes(collection, value, fromIndex) {
        let rs = false;
        fromIndex = fromIndex || 0;
        if (isString(collection)) {
            return collection.includes(value, fromIndex);
        }
        collection = isArrayLike(collection)
            ? slice(collection, fromIndex)
            : collection;
        each(collection, (v) => {
            if (eq$1(v, value)) {
                rs = true;
                return false;
            }
        });
        return rs;
    }

    /**
     * 删除数组中断言结果为true的元素并返回被删除的元素
     * <div class="alert alert-secondary">
          该函数会修改原数组
        </div>
     *
     * @example
     * //[1, 3] [2, 4]
     * let ary = [1,2,3,4];
     * console.log(_.remove(ary,x=>x%2),ary)
     * //[2] [1,3]
     * ary = [{a:1},{a:2},{a:3}];
     * console.log(_.remove(ary,v=>v.a===2),ary)
     * //[3] [1,2]
     * ary = [{a:1},{a:2},{a:3}];
     * console.log(_.remove(ary,{a:3}),ary)
     *
     * @param array 数组对象，如果参数非数组直接返回
     * @param predicate (value[,index[,array]]);断言
     * <br>当断言是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils!iteratee}
     * @returns 被删除的元素数组或空数组
     * @since 0.19.0
     */
    function remove(array, predicate) {
        const rs = [];
        if (!isArray(array))
            return rs;
        const itee = iteratee(predicate);
        let i = 0;
        for (let l = 0; l < array.length; l++) {
            const item = array[l];
            const r = itee(item, l, array);
            if (r) {
                rs.push(item);
            }
            else {
                array[i++] = item;
            }
        }
        array.length = i;
        return rs;
    }

    /**
     * 与without相同，但会修改原数组
     * <div class="alert alert-secondary">
          该函数会修改原数组
        </div>
     *
     * @example
     * //[1, 1] true
     * let ary = [1,2,3,4,3,2,1];
     * let newAry = _.pull(ary,2,3,4)
     * console.log(newAry,ary === newAry)
     *
     * @param array 数组对象
     * @param values 需要删除的值
     * @returns 新数组
     * @since 0.19.0
     */
    function pull(array, ...values) {
        remove(array, (item) => includes(values, item));
        return array;
    }

    function range(start = 0, end, step) {
        let startNum = 0;
        let endNum = 0;
        let stepNum = 1;
        if (isNumber(start) && isUndefined(end) && isUndefined(step)) {
            endNum = start >> 0;
        }
        else if (isNumber(start) && isNumber(end) && isUndefined(step)) {
            startNum = start >> 0;
            endNum = end >> 0;
        }
        else if (isNumber(start) && isNumber(end) && isNumber(step)) {
            startNum = start >> 0;
            endNum = end >> 0;
            stepNum = step || 1;
        }
        const rs = Array(Math.round(Math.abs(endNum - startNum) / stepNum));
        let rsIndex = 0;
        if (endNum > startNum) {
            for (let i = startNum; i < endNum; i += stepNum) {
                rs[rsIndex++] = i;
            }
        }
        else if (endNum < startNum) {
            for (let i = startNum; i > endNum; i -= stepNum) {
                rs[rsIndex++] = i;
            }
        }
        return rs;
    }

    /**
     * 对数组元素位置进行颠倒，返回改变后的数组。
     *
     *  @example
     * //[3, 2, 1]
     * console.log(_.reverse([1, 2, 3]))
     *
     * @param array 数组，类数组或Set
     * @returns 颠倒后的新数组
     */
    function reverse(array) {
        const rs = toArray(array);
        return rs.reverse();
    }

    /**
     * 同<code>sortedIndex</code>，但支持自定义回调用来获取对比值
     * @example
     * //2
     * console.log(_.sortedIndexBy([{a:1},{a:2},{a:3}], {a:2.5},'a'))
     *
     * @param array 对象属性标识符数组
     * @param value 需要插入数组的值
     * @param itee (value)回调函数，返回排序对比值。默认 identity
     * @returns array索引
     * @since 1.0.0
     */
    function sortedIndexBy(array, value, itee) {
        let left = 0;
        let right = size(array);
        let index = 0;
        const cb = iteratee(itee || identity);
        value = cb(value);
        while (left < right) {
            const mid = parseInt((left + right) / 2 + '');
            if (cb(array[mid]) < value) {
                left = mid + 1;
                index = left;
            }
            else {
                right = mid;
            }
        }
        return index;
    }

    /**
     * 使用二分法确定在array保持排序不变的情况下，value可以插入array的最小索引
     * @example
     * //1
     * console.log(_.sortedIndex([1,2,3],1.5))
     * //1
     * console.log(_.sortedIndex(['a', 'c'], 'b'))
     * //0
     * console.log(_.sortedIndex([{a:1},{a:2},{a:3}], {a:2.5}))
     *
     * @param array 对象属性标识符数组
     * @param value 需要插入数组的值
     * @returns array索引
     * @since 1.0.0
     */
    function sortedIndex(array, value) {
        return sortedIndexBy(array, value);
    }

    function map(collection, itee) {
        const rs = [];
        const cb = iteratee(itee);
        each(collection, (v, k, c) => {
            const r = cb(v, k, c);
            rs.push(r);
        });
        return rs;
    }

    /**
     * 对所有集合做并集并返回并集元素组成的新数组。并集类似concat()但不允许重复值
     *
     * @example
     * //[1, 2, 3]
     * console.log(_.union([1,2,3],[2,3]))
     * //[1, 2, 3, "1", "2"]
     * console.log(_.union([1,2,3],['1','2']))
     * //[{name: "a"},{name: "b"}]
     * console.log(_.union([{name:'a'},{name:'b'}],[{name:'a'}],v=>v.name))
     * //[a/b/a] 没有标识函数无法去重
     * console.log(_.union([{name:'a'},{name:'b'}],[{name:'a'}]))
     * //[1, 2, 3, "3"] "3"和3不相等
     * console.log(_.union([1,2,3],[1,3],[2,'3',1]))
     *
     * @param params (...arrays[,identifier(v)])
     * arrays - 1-n个数组或arraylike对象，非arraylike参数会被忽略;
     * identifier - 标识函数，用来对每个元素返回唯一标识，标识相同的值会认为相等。使用<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Same-value-zero_equality">SameValueZero</a> 算法进行值比较。如果为空，直接使用值自身比较
     * @returns 并集元素组成的新数组
     */
    function union(...params) {
        let comparator;
        let list = params;
        const sl = params.length;
        if (sl > 2 && isFunction(params[sl - 1])) {
            comparator = params[sl - 1];
            list = params.slice(0, sl - 1);
        }
        list = list.filter((v) => isArrayLike(v) || isArray(v));
        if (list.length < 1)
            return list;
        let rs;
        if (comparator) {
            const kvMap = new Map();
            flat(list).forEach((v) => {
                const id = comparator(v);
                if (!kvMap.get(id)) {
                    kvMap.set(id, v);
                }
            });
            rs = map(kvMap, (v) => v);
        }
        else {
            rs = toArray(new Set(flat(list)));
        }
        return rs;
    }

    /**
     * 对数组内的值进行去重
     * @example
     * // [1,2,4,"a","1",null]
     * console.log(_.unique([1,2,2,4,4,'a','1','a',null,null]))
     *
     * @param array 数组，非数组返回空数组
     * @returns 转换后的新数组对象
     */
    function uniq(array) {
        if (!Array.isArray(array))
            return [];
        return toArray(new Set(array));
    }

    /**
     * 同<code>uniq</code>，但支持自定义筛选函数
     * @example
     * // [{"a":1},{"a":"1"},{"a":2},{"a":"2"}]
     * console.log(_.uniqBy([{a:1},{a:1},{a:'1'},{a:2},{a:'2'},{a:2}],'a'))
     * // [{"a":1},{"a":2}]
     * console.log(_.uniqBy([{a:1},{a:1},{a:'1'},{a:2},{a:'2'},{a:2}],v=>v.a>>0))
     *
     * @param array 数组
     * @param itee (value,index) 筛选函数，返回需要对比的值。默认identity
     * <br>当iteratee是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils.iteratee}
     * @returns 去重后的新数组对象
     * @since 1.0.0
     */
    function uniqBy(array, itee) {
        const cb = iteratee(itee || identity);
        const keyMap = new Map();
        const rs = [];
        each(array, (v, k) => {
            const key = cb(v, k);
            if (keyMap.get(key))
                return;
            keyMap.set(key, 1);
            rs.push(v);
        });
        return rs;
    }

    /**
     * <code>zip</code>的反操作
     * @example
     * //[[1,2,undefined],['a','b','c']]
     * console.log(_.unzip([[1, 'a'],[2, 'b'],[undefined, 'c']]))
     * //[['a', 'b', 'c'], [1, 2, undefined],['1', undefined,undefined]]
     * console.log(_.unzip([['a', 1, '1'], ['b', 2],['c']]))
     *
     * @param array 包含若干分组的数组
     * @returns 重新分组后的新数组
     * @since 0.23.0
     */
    function unzip(array) {
        const rs = [];
        const len = size(array);
        each(array, (group, colIndex) => {
            each(group, (el, rowIndex) => {
                let row = rs[rowIndex];
                if (!row) {
                    row = rs[rowIndex] = new Array(len);
                }
                row[colIndex] = el;
            });
        });
        return rs;
    }

    function filter(collection, predicate) {
        const rs = [];
        const callback = iteratee(predicate);
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (r) {
                rs.push(v);
            }
        });
        return rs;
    }

    /**
     * 返回删除所有values后的新数组。使用<code>eq</code>函数进行等值判断
     *
     * @example
     * //[1, 1]
     * console.log(_.without([1,2,3,4,3,2,1],2,3,4))
     *
     * @param array 数组对象
     * @param values 需要删除的值
     * @returns 新数组
     * @since 0.19.0
     */
    function without(array, ...values) {
        return filter(array, (item) => !includes(values, item));
    }

    /**
     * 创建一个由指定数组arrays内元素重新分组后组成的二维数组，
     * 第一个子数组由每个数组内的第一个元素组成，第二个子数组由每个数组内的第二个元素组成，以此类推。
     * 子数组的数量由参数中数组内元素最多的数组决定。
     * @example
     * //[[1, 'a'],[2, 'b'],[undefined, 'c']]
     * console.log(_.zip([1,2],['a','b','c']))
     * //[['a', 1, '1'], ['b', 2, undefined],['c', undefined,undefined]]
     * console.log(_.zip(['a','b','c'],[1,2],['1']))
     *
     * @param arrays 1-n个数组
     * @returns 重新分组后的新数组
     * @since 0.23.0
     */
    function zip(...arrays) {
        const rs = [];
        const size = arrays.length;
        arrays.forEach((ary, colIndex) => {
            each(ary, (el, i) => {
                let group = rs[i];
                if (!group) {
                    group = rs[i] = new Array(size);
                }
                group[colIndex] = el;
            });
        });
        return rs;
    }

    /**
     * 创建一个对象，属性名称与属性值分别来自两个数组
     * @example
     * //{a: 1, b: 2}
     * console.log(_.zipObject(['a','b'],[1,2,3]))
     *
     * @param keys 对象属性标识符数组
     * @param values 对象值数组
     * @returns 组合后的对象
     * @since 0.23.0
     */
    function zipObject(keys, values) {
        const rs = {};
        each(keys, (k, i) => {
            rs[k] = get(values, i);
        });
        return rs;
    }

    /**
     * 与<code>zip</code>相同，但支持自定义组合逻辑
     * @example
     * //[[1, 3, 5], [2, 4, 6]]
     * console.log(_.zipWith([1,2],[3,4],[5,6]))
     * //[9, 12]
     * console.log(_.zipWith([1,2],[3,4],[5,6],_.sum))
     * //[3, 4]
     * console.log(_.zipWith([1,2],[3,4],[5,6],group=>_.avg(group)))
     *
     * @param params (...arrays[,iteratee(group)])
     * arrays - 1-n个数组或arraylike对象，非arraylike参数会被忽略;
     * iteratee - 回调函数，返回组合后的分组值。默认使用<code>identity</code>函数
     *
     * @returns 重新分组后的新数组
     * @since 1.0.0
     */
    function zipWith(...params) {
        const sl = params.length;
        let itee = params[sl - 1];
        const arys = params;
        if (!isFunction(itee)) {
            itee = identity;
        }
        else {
            pop(arys);
        }
        const rs = zip(...arys);
        return map(rs, (group) => itee(group));
    }

    var array = /*#__PURE__*/Object.freeze({
        __proto__: null,
        append: append,
        chunk: chunk,
        compact: compact,
        concat: concat,
        except: except,
        fill: fill,
        findIndex: findIndex,
        findLastIndex: findLastIndex,
        flat: flat,
        flatDeep: flatDeep,
        insert: insert,
        intersect: intersect,
        join: join,
        pop: pop,
        pull: pull,
        range: range,
        remove: remove,
        reverse: reverse,
        slice: slice,
        sortedIndex: sortedIndex,
        sortedIndexBy: sortedIndexBy,
        union: union,
        uniq: uniq,
        uniqBy: uniqBy,
        unzip: unzip,
        without: without,
        zip: zip,
        zipObject: zipObject,
        zipWith: zipWith
    });

    function countBy(collection, itee) {
        const stat = {};
        const cb = iteratee(itee || identity);
        each(collection, (el) => {
            const key = cb(el);
            if (stat[key] === undefined)
                stat[key] = 0;
            stat[key]++;
        });
        return stat;
    }

    function eachRight(collection, callback) {
        let values;
        let keys;
        if (isString(collection) || isArrayLike(collection)) {
            let size = collection.length;
            while (size--) {
                const r = callback(collection[size], size, collection);
                if (r === false)
                    return;
            }
        }
        else if (isSet(collection)) {
            let size = collection.size;
            values = Array.from(collection);
            while (size--) {
                const r = callback(values[size], size, collection);
                if (r === false)
                    return;
            }
        }
        else if (isMap(collection)) {
            let size = collection.size;
            keys = collection.keys();
            values = collection.values();
            keys = Array.from(keys);
            values = Array.from(values);
            while (size--) {
                const r = callback(values[size], keys[size], collection);
                if (r === false)
                    return;
            }
        }
        else if (isObject(collection)) {
            keys = Object.keys(collection);
            let size = keys.length;
            while (size--) {
                const k = keys[size];
                const r = callback(collection[k], k, collection);
                if (r === false)
                    return;
            }
        }
    }

    function every(collection, predicate) {
        let rs = true;
        const callback = iteratee(predicate);
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (!r) {
                rs = false;
                return false;
            }
        });
        return rs;
    }

    function find(collection, predicate) {
        const callback = iteratee(predicate);
        let rs;
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (r) {
                rs = v;
                return false;
            }
        });
        return rs;
    }

    function findLast(collection, predicate) {
        const callback = iteratee(predicate);
        let rs;
        eachRight(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (r) {
                rs = v;
                return false;
            }
        });
        return rs;
    }

    function first(array) {
        return toArray(array)[0];
    }

    function flatMap(collection, itee, depth) {
        return flat(map(collection, itee), depth || 1);
    }

    function flatMapDeep(collection, itee) {
        return flatMap(collection, itee, Infinity);
    }

    function groupBy(collection, itee) {
        const stat = {};
        const cb = iteratee(itee || identity);
        each(collection, (el) => {
            const key = cb(el);
            if (stat[key] === undefined)
                stat[key] = [];
            stat[key].push(el);
        });
        return stat;
    }

    /**
     * 返回除最后一个元素外的所有元素组成的新数组
     *
     * @example
     * //[1, 2]
     * console.log(_.initial([1, 2, 3]))
     *
     * @param array 数组
     * @returns 新数组
     * @since 0.19.0
     */
    function initial(array) {
        let ary = toArray(array);
        return ary.slice(0, ary.length - 1);
    }

    function keyBy(collection, itee) {
        const stat = {};
        const cb = iteratee(itee || identity);
        each(collection, (el) => {
            const key = cb(el);
            stat[key] = el;
        });
        return stat;
    }

    function last(array) {
        const ary = toArray(array);
        return ary[ary.length - 1];
    }

    function partition(collection, predicate) {
        const matched = [];
        const mismatched = [];
        const callback = iteratee(predicate);
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (r) {
                matched.push(v);
            }
            else {
                mismatched.push(v);
            }
        });
        return [matched, mismatched];
    }

    function reduce(collection, callback, initialValue) {
        let accumulator = initialValue;
        let hasInitVal = initialValue !== undefined;
        each(collection, (v, k, c) => {
            if (hasInitVal) {
                accumulator = callback(accumulator, v, k, c);
            }
            else {
                accumulator = v;
                hasInitVal = true;
            }
        });
        return accumulator;
    }

    function reject(collection, predicate) {
        const rs = [];
        const callback = iteratee(predicate);
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (!r) {
                rs.push(v);
            }
        });
        return rs;
    }

    function randi(min, max) {
        let maxNum = max || min;
        if (max === undefined) {
            min = 0;
        }
        maxNum >>= 0;
        min >>= 0;
        return (Math.random() * (maxNum - min) + min) >> 0;
    }

    /**
     * 返回对指定列表的唯一随机采样结果
     * @example
     * //随机值
     * console.log(_.sample([1,2,3,4,5,6,7,8,9,0]))
     * //随机值
     * console.log(_.sample({a:1,b:2,c:3,d:4,e:5}))
     *
     * @param collection 任何可遍历的集合类型，比如array / arraylike / set / map / object / ...
     * @returns 采样结果
     * @since 0.16.0
     */
    function sample(collection) {
        const ary = toArray(collection);
        return ary[randi(ary.length)];
    }

    /**
     * 返回对指定列表的指定数量随机采样结果
     * @example
     * //[随机值]
     * console.log(_.sampleSize([1,2,3,4,5,6,7,8,9,0]))
     * //[随机值1,随机值2]
     * console.log(_.sampleSize([{a:1},{b:2},{c:3},{d:4},{e:5}],2))
     *
     * @param collection 任何可遍历的集合类型，比如array / arraylike / set / map / object / ...
     * @param [count=1] 采样数量
     * @returns 采样结果
     * @since 0.16.0
     */
    function sampleSize(collection, count) {
        count = count || 1;
        const ary = toArray(collection);
        const seeds = range(0, ary.length);
        const ks = [];
        while (seeds.length > 0) {
            if (count-- < 1)
                break;
            const i = pop(seeds, randi(seeds.length));
            if (i)
                ks.push(i);
        }
        const rs = map(ks, (v) => ary[v]);
        return rs;
    }

    /**
     * 返回指定数组的一个随机乱序副本
     * @example
     * //[随机内容]
     * console.log(_.shuffle([1,2,3,4,5,6,7,8,9,0]))
     * //[随机内容]
     * console.log(_.shuffle([{a:1},{a:2},{a:3},{a:4},{a:5}]))
     * //[随机内容]
     * console.log(_.shuffle({a:1,b:2,c:3,d:4,e:5}))
     *
     * @param collection 任何可遍历的集合类型，比如array / arraylike / set / map / object / ...
     * @returns 乱序副本
     * @since 0.16.0
     */
    function shuffle(collection) {
        return sampleSize(collection, size(collection));
    }

    function some(collection, predicate) {
        let rs = false;
        const callback = iteratee(predicate || (() => true));
        each(collection, (v, k, c) => {
            const r = callback(v, k, c);
            if (r) {
                rs = true;
                return false;
            }
        });
        return rs;
    }

    const TIME_MAP$1 = {
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24,
    };
    // const DATE_CONVERT_EXP = /(\d+)-(\d+)-(\d+)/;
    /**
     * 比较两个日期，并返回由比较时间单位确定的相差时间。
     * <p>
     * 使用truncated对比算法 —— 小于指定时间单位的值会被视为相同，
     * 比如对比月，则两个日期的 日/时/分/秒 会被认为相同，以此类推。
     * </p>
     * 相差时间为正数表示date1日期晚于(大于)date2，负数相反，0表示时间/日期相同。
     * <p>
     * 注意，如果对比单位是 h/m/s，务必要保持格式一致，比如
     *
     * ```ts
     * //实际相差8小时
     * new Date('2020-01-01')
     * //vs
     * new Date('2020/01/01')
     * ```
     *
     * @example
     * //0
     * console.log(_.compareDate(new Date('2020/05/01'),'2020/5/1'))
     * //格式不一致，相差8小时
     * console.log(_.compareDate(new Date('2020-05-01'),'2020/5/1','h'))
     * //-59
     * console.log(_.compareDate(new Date('2019/01/01'),'2019/3/1'))
     *
     * @param date1 日期对象、时间戳或合法格式的日期时间字符串。
     * 对于字符串格式，可以时<a href="https://www.iso.org/iso-8601-date-and-time-format.html">UTC格式</a>，或者
     * <a href="https://tools.ietf.org/html/rfc2822#section-3.3">RFC2822</a>格式
     * @param date2 同date1
     * @param [type='d'] 比较时间单位
     * <ul>
     * <li><code>y</code> 年</li>
     * <li><code>M</code> 月</li>
     * <li><code>d</code> 日</li>
     * <li><code>h</code> 时</li>
     * <li><code>m</code> 分</li>
     * <li><code>s</code> 秒</li>
     * </ul>
     * @returns 根据比较时间单位返回的比较值。正数为date1日期晚于(大于)date2，负数相反，0表示相同。
     */
    function compareDate(date1, date2, type) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        type = type || 'd';
        if (type === 'y') {
            return d1.getFullYear() - d2.getFullYear();
        }
        else if (type === 'M') {
            return ((d1.getFullYear() - d2.getFullYear()) * 12 +
                (d1.getMonth() - d2.getMonth()));
        }
        else {
            switch (type) {
                case 'd':
                    d1.setHours(0, 0, 0, 0);
                    d2.setHours(0, 0, 0, 0);
                    break;
                case 'h':
                    d1.setHours(d1.getHours(), 0, 0, 0);
                    d2.setHours(d2.getHours(), 0, 0, 0);
                    break;
                case 'm':
                    d1.setHours(d1.getHours(), d1.getMinutes(), 0, 0);
                    d2.setHours(d2.getHours(), d2.getMinutes(), 0, 0);
                    break;
            }
            const diff = d1.getTime() - d2.getTime();
            return diff / TIME_MAP$1[type];
        }
    }

    /**
     * 判断值是不是一个Date实例
     *
     * @example
     * //true
     * console.log(_.isDate(new Date()))
     * //false
     * console.log(_.isDate('2020/1/1'))
     *
     * @param v
     * @returns
     */
    function isDate(v) {
        return v instanceof Date || Object.prototype.toString.call(v) === '[object Date]';
    }

    /**
     * 转换任何对象为字符串。如果对象本身为string类型的值/对象，则返回该对象的字符串形式。否则返回对象的toString()方法的返回值
     *
     * @example
     * //''
     * console.log(_.toString(null))
     * //1
     * console.log(_.toString(1))
     * //3,6,9
     * console.log(_.toString([3,6,9]))
     * //-0
     * console.log(_.toString(-0))
     * //[object Set]
     * console.log(_.toString(new Set([3,6,9])))
     * //{a:1}
     * console.log(_.toString({a:1,toString:()=>'{a:1}'}))
     *
     * @param v 任何值
     * @returns 对于null/undefined会返回空字符串
     */
    function toString(v) {
        if (isNil(v))
            return '';
        if (v === 0 && 1 / v < 0)
            return '-0';
        return v.toString();
    }

    function sortBy(collection, itee) {
        if (size(collection) < 1)
            return [];
        const cb = iteratee(itee || identity);
        let i = 0;
        const list = map(collection, (v, k) => {
            return {
                src: v,
                index: i++,
                value: cb(v, k),
            };
        });
        const comparator = getComparator(list[0].value);
        return map(list.sort((a, b) => !eq$1(a.value, b.value) ? comparator(a.value, b.value) : a.index - b.index), (item) => item.src);
    }
    // comparators
    const compareNumAsc = (a, b) => {
        if (isNil(a) || !isNumber(a))
            return 1;
        if (isNil(b) || !isNumber(b))
            return -1;
        return a - b;
    };
    const compareStrAsc = (a, b) => {
        if (isNil(a))
            return 1;
        if (isNil(b))
            return -1;
        return toString(a).localeCompare(toString(b));
    };
    const compareDateAsc = (a, b) => {
        if (isNil(a))
            return 1;
        if (isNil(b))
            return -1;
        return compareDate(a, b);
    };
    // eslint-disable-next-line require-jsdoc
    function getComparator(el) {
        let comparator;
        if (isNumber(el)) {
            comparator = compareNumAsc;
        }
        else if (isDate(el)) {
            comparator = compareDateAsc;
        }
        else {
            comparator = compareStrAsc;
        }
        return comparator;
    }

    /**
     * 对集合进行排序，并返回排序后的数组副本。
     *
     * @example
     * //字符排序 ['lao1', 'lao2', 'lao3']
     * console.log(_.sort(['lao1','lao3','lao2']))
     * //数字排序[7, 9, 80]
     * console.log(_.sort([9,80,7]))
     * //日期排序["3/1/2019", "2020/1/1", Wed Apr 01 2020...]
     * console.log(_.sort([new Date(2020,3,1),'2020/1/1','3/1/2019']))
     * //第一个元素不是日期对象，需要转换
     * console.log(_.sort(_.map(['2020/1/1',new Date(2020,3,1),'3/1/2019'],v=>new Date(v))))
     * //对象排序
     * const users = [
     *  {name:'zhangsan',age:53},
     *  {name:'lisi',age:44},
     *  {name:'wangwu',age:25},
     *  {name:'zhaoliu',age:36}
     * ];
     * //[25,36,44,53]
     * console.log(_.sort(users,(a,b)=>a.age-b.age))
     * // 倒排
     * console.log(_.sort(users,(a,b)=>b.age-a.age))
     *
     * @param collection 任何可遍历的集合类型，比如array / arraylike / set / map / object / ...
     * @param [comparator] (a,b) 排序函数，如果为空使用sortBy逻辑
     * @returns 排序后的数组
     */
    function sort(collection, comparator) {
        const ary = toArray(collection);
        if (ary.length < 1)
            return ary;
        if (isFunction(comparator)) {
            return ary.sort(comparator);
        }
        else {
            return sortBy(collection);
        }
    }

    /**
     * 返回除第一个元素外的所有元素组成的新数组
     *
     * @example
     * //[2, 3]
     * console.log(_.tail([1, 2, 3]))
     *
     * @param array 数组
     * @returns 新数组
     */
    function tail(array) {
        const rs = toArray(array);
        return rs.slice(1);
    }

    /**
     * 从起始位置获取指定数量的元素并放入新数组后返回
     *
     * @example
     * //[1, 2, 3]
     * console.log(_.take([1, 2, 3, 4, 5],3))
     * //[1, 2, 3, 4, 5]
     * console.log(_.take([1, 2, 3, 4, 5]))
     *
     * @param array 数组
     * @param [length] 获取元素数量，默认数组长度
     * @returns 新数组
     */
    function take(array, length) {
        const rs = toArray(array);
        return rs.slice(0, length);
    }

    /**
     * 从数组末尾位置获取指定数量的元素放入新数组并返回
     *
     * @example
     * //[3, 4, 5]
     * console.log(_.takeRight([1, 2, 3, 4, 5],3))
     * //[1, 2, 3, 4, 5]
     * console.log(_.takeRight([1, 2, 3, 4, 5]))
     *
     * @param array 数组
     * @param length
     * @returns 新数组
     * @since 1.0.0
     */
    function takeRight(array, length) {
        const rs = toArray(array);
        const maxLength = rs.length;
        return rs.slice(maxLength - (length || maxLength), maxLength);
    }

    var collection = /*#__PURE__*/Object.freeze({
        __proto__: null,
        countBy: countBy,
        each: each,
        eachRight: eachRight,
        every: every,
        filter: filter,
        find: find,
        findLast: findLast,
        first: first,
        flatMap: flatMap,
        flatMapDeep: flatMapDeep,
        groupBy: groupBy,
        includes: includes,
        initial: initial,
        keyBy: keyBy,
        last: last,
        map: map,
        partition: partition,
        reduce: reduce,
        reject: reject,
        sample: sample,
        sampleSize: sampleSize,
        shuffle: shuffle,
        size: size,
        some: some,
        sort: sort,
        sortBy: sortBy,
        tail: tail,
        take: take,
        takeRight: takeRight,
        toArray: toArray
    });

    const TIME_MAP = {
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24,
    };
    /**
     * 对日期时间进行量变处理
     *
     * @example
     * //2020/5/1 08:00:20
     * console.log(_.formatDate(_.addTime(new Date('2020-05-01'),20),'yyyy/MM/dd hh:mm:ss'))
     * //2020-04-11 08:00
     * console.log(_.formatDate(_.addTime(new Date('2020-05-01'),-20,'d')))
     * //2022-01-01 00:00
     * console.log(_.formatDate(_.addTime(new Date('2020-05-01 0:0'),20,'M')))
     *
     * @param date 原日期时间
     * @param amount 变化量，可以为负数
     * @param [type='s'] 量变时间类型
     * <ul>
     * <li><code>y</code> 年</li>
     * <li><code>M</code> 月</li>
     * <li><code>d</code> 日</li>
     * <li><code>h</code> 时</li>
     * <li><code>m</code> 分</li>
     * <li><code>s</code> 秒</li>
     * </ul>
     * @returns 日期对象
     */
    function addTime(date, amount, type) {
        type = type || 's';
        const d = new Date(date);
        switch (type) {
            case 'y':
                d.setFullYear(d.getFullYear() + amount);
                break;
            case 'M':
                d.setMonth(d.getMonth() + amount);
                break;
            default:
                let times = 0;
                times = amount * TIME_MAP[type];
                d.setTime(d.getTime() + times);
        }
        return d;
    }

    /**
     * 判断值是不是一个整数
     *
     * @example
     * //true
     * console.log(_.isInteger(-0))
     * //true
     * console.log(_.isInteger(5.0))
     * //false
     * console.log(_.isSafeInteger(5.000000000000001))
     * //true
     * console.log(_.isSafeInteger(5.0000000000000001))
     * //false
     * console.log(_.isInteger('5'))
     * //true
     * console.log(_.isInteger(Number.MAX_SAFE_INTEGER))
     * //true
     * console.log(_.isInteger(Number.MAX_VALUE))
     *
     * @param v
     * @returns
     */
    function isInteger(v) {
        return Number.isInteger(v);
    }

    /**
     * 使用填充字符串填充原字符串达到指定长度。从原字符串末尾开始填充。
     *
     * @example
     * //100
     * console.log(_.padEnd('1',3,'0'))
     * //1-0-0-
     * console.log(_.padEnd('1',6,'-0'))
     * //1
     * console.log(_.padEnd('1',0,'-0'))
     *
     * @param str 原字符串
     * @param len 填充后的字符串长度，如果长度小于原字符串长度，返回原字符串
     * @param [padString=' '] 填充字符串，如果填充后超出指定长度，会自动截取并保留左侧字符串
     * @returns 在原字符串末尾填充至指定长度后的字符串
     */
    function padEnd(str, len, padString) {
        str = toString(str);
        if (str.padEnd)
            return str.padEnd(len, padString);
        padString = padString || ' ';
        const diff = len - str.length;
        if (diff < 1)
            return str;
        let fill = '';
        let i = Math.ceil(diff / padString.length);
        while (i--) {
            fill += padString;
        }
        return str + fill.substring(0, diff);
    }

    /**
     * 通过指定参数得到日期对象。支持多种签名
     *
     * ```js
     * _.toDate(1320940800); //timestamp unix style
     * _.toDate(1320940800123); //timestamp javascript style
     * _.toDate([year,month,day]); //注意，month的索引从1开始
     * _.toDate([year,month,day,hour,min,sec]); //注意，month的索引从1开始
     * _.toDate(datetimeStr);
     * ```
     *
     * @example
     * //'2011/11/11 00:00:00'
     * console.log(_.toDate(1320940800).toLocaleString())
     * //'2011/11/11 00:01:39'
     * console.log(_.toDate(1320940899999).toLocaleString())
     * //'2022/12/12 00:00:00'
     * console.log(_.toDate([2022,11,12]).toLocaleString())
     * //'2022/12/12 12:12:12'
     * console.log(_.toDate([2022,11,12,12,12,12]).toLocaleString())
     * //'2022/2/2 00:00:00'
     * console.log(_.toDate('2022/2/2').toLocaleString())
     * //'2022/2/2 08:00:00'
     * console.log(_.toDate('2022-02-02').toLocaleString())
     *
     * @param value 转换参数
     *
     * @returns 转换后的日期。无效日期统一返回1970/1/1
     */
    function toDate(value) {
        let rs;
        if (isInteger(value)) {
            if (value < TIMESTAMP_MIN) {
                value = toNumber(padEnd(value + '', 13, '0'));
            }
            else if (value > TIMESTAMP_MAX) {
                value = 0;
            }
            rs = new Date(value);
        }
        else if (isArray(value)) {
            rs = new Date(value[0], value[1] - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0, value[6] || 0);
        }
        else {
            rs = new Date(value);
        }
        if (rs.toDateString() === 'Invalid Date') {
            rs = new Date(0);
        }
        return rs;
    }
    const TIMESTAMP_MIN = 1000000000000;
    const TIMESTAMP_MAX = 9999999999999;

    /**
     * 指定日期是否是闰年
     * @param date 日期对象
     * @returns 闰年返回true
     */
    function isLeapYear(date) {
        date = toDate(date);
        const year = date.getFullYear();
        return year % 400 === 0 || year % 4 === 0;
    }

    const DaysOfMonth = [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    /**
     * 获取指定日期在当前年中的天数并返回
     * @param date 日期对象
     * @returns {number} 当前年中的第几天
     */
    function getDayOfYear(date) {
        date = toDate(date);
        const leapYear = isLeapYear(date);
        const month = date.getMonth();
        let dates = date.getDate();
        for (let i = 0; i < month; i++) {
            const ds = DaysOfMonth[i] || (leapYear ? 29 : 28);
            dates += ds;
        }
        return dates;
    }

    /**
     * 获取指定日期在当前月中的周数并返回
     * @param date 日期对象
     * @returns {number} 当前月中的第几周
     */
    function getWeekOfMonth(date) {
        date = toDate(date);
        const year = date.getFullYear();
        let firstDayOfMonth = new Date(year, date.getMonth(), 1);
        let extraWeek = 0;
        //超过周5多1周
        let d = firstDayOfMonth.getDay();
        if (d === 0 || d > 5) {
            extraWeek = 1;
        }
        return Math.ceil(date.getDate() / 7) + extraWeek;
    }

    /**
     * 获取指定日期在当前年中的周数并返回
     * @param date 日期对象
     * @returns {number} 当前年中的第几周
     */
    function getWeekOfYear(date) {
        date = toDate(date);
        const year = date.getFullYear();
        let firstDayOfYear = new Date(year, 0, 1);
        let extraWeek = 0;
        //超过周5多1周
        let d = firstDayOfYear.getDay();
        if (d === 0 || d > 5) {
            extraWeek = 1;
        }
        return Math.ceil(getDayOfYear(date) / 7) + extraWeek;
    }

    const INVALID_DATE = '';
    const SearchExp = /y{2,4}|M{1,3}|d{1,4}|h{1,2}|m{1,2}|s{1,2}|Q{1,2}|E{1,2}|W{1,2}|w{1,2}|H{1,2}|S|a/gm;
    const pad0 = (str) => str.length > 1 ? str : '0' + str;
    const pad00 = (str) => str.length > 2 ? str : (str.length > 1 ? '0' + str : '00' + str);
    /**
     * 通过表达式格式化日期时间
     *
     * ```
     * yyyy-MM-dd hh:mm:ss => 2020-12-11 10:09:08
     * ```
     *
     * pattern解释：
     *
     * - `yy` 2位年 - 22
     * - `yyyy` 4位年 - 2022
     * - `M` 1位月(1-12)
     * - `MM` 2位月(01-12)
     * - `MMM` 月描述(一月 - 十二月)
     * - `d` 1位日(1-30/31/29/28)
      - `dd` 2位日(01-30/31/29/28)
      - `ddd` 一年中的日(1-365)
      - `dddd` 一年中的日(001-365)
      - `h` 1位小时(1-12)
      - `hh` 2位小时(01-12)
      - `H` 1位小时(0-23)
      - `HH` 2位小时(00-23)
      - `m` 1位分钟(0-59)
      - `mm` 2位分钟(00-59)
      - `s` 1位秒(0-59)
      - `ss` 2位秒(00-59)
      - `Q` 季度(1-4)
      - `QQ` 季度描述(春-冬)
      - `W` 一年中的周(1-53)
      - `WW` 一年中的周(01-53)
      - `w` 一月中的周(1-6)
      - `ww` 一月中的周描述(第一周 - 第六周)
      - `E` 星期(1-7)
      - `EE` 星期描述(星期一 - 星期日)
      - `S` 毫秒
      - `a` AM/PM
     *
     * @example
     * //now time
     * console.log(_.formatDate(_.now(),'yyyy-MM-dd hh:mm'))
     * //2/1/2021
     * console.log(_.formatDate('2021-2-1','M/d/yyyy'))
     * //2/1/21
     * console.log(_.formatDate('2021-2-1','M/d/yy'))
     * //02/01/21
     * console.log(_.formatDate('2021-2-1','MM/dd/yy'))
     * //02/01/2021
     * console.log(_.formatDate('2021-2-1','MM/dd/yyyy'))
     * //21/02/01
     * console.log(_.formatDate('2021-2-1','yy/MM/dd'))
     * //2021-02-01
     * console.log(_.formatDate('2021-2-1','yyyy-MM-dd'))
     * //21-12-11 10:09:08
     * console.log(_.formatDate('2021-12-11T10:09:08','yy-MM-dd HH:mm:ss'))
     * //12/11/2020 1009
     * console.log(_.formatDate('2020-12-11 10:09:08','MM/dd/yyyy hhmm'))
     * //2020-12-11 08:00
     * console.log(_.formatDate(1607644800000))
     * //''
     * console.log(_.formatDate('13:02'))
     * //''
     * console.log(_.formatDate(null))
     * //现在时间:(20-12-11 10:09:08)
     * console.log(_.formatDate('2020-12-11 10:09:08','现在时间:(yy-MM-dd hh:mm:ss)'))
     *
     * @param val 需要格式化的值，可以是日期对象或时间字符串或日期毫秒数
     * @param [pattern='yyyy-MM-dd HH:mm:ss'] 格式化模式
     * @returns 格式化后的日期字符串，无效日期返回空字符串
     */
    function formatDate(val, pattern) {
        pattern = pattern || 'yyyy-MM-dd HH:mm:ss';
        let formatter = cache$1[pattern];
        if (!formatter) {
            formatter = (date) => {
                if (!date)
                    return INVALID_DATE;
                let ptn = pattern + '';
                if (typeof date === 'string' || typeof date === 'number') {
                    date = toDate(date);
                }
                if (date.toString().indexOf('Invalid') > -1)
                    return INVALID_DATE;
                let valDate = date;
                return ptn.replace(SearchExp, (tag) => {
                    const cap = tag[0];
                    const month = valDate.getMonth();
                    const locale = Locale[Lang];
                    if (cap === 'y') {
                        const year = valDate.getFullYear();
                        return tag === 'yy' ? (year % 100) + '' : year + '';
                    }
                    else if (cap === 'M') {
                        switch (tag) {
                            case 'M':
                                return month + 1 + '';
                            case 'MM':
                                return pad0(month + 1 + '');
                            case 'MMM':
                                return locale?.months[month] || tag;
                        }
                    }
                    else if (cap === 'd') {
                        let dayOfMonth = valDate.getDate();
                        switch (tag) {
                            case 'd':
                                return dayOfMonth + '';
                            case 'dd':
                                return pad0(dayOfMonth + '');
                            case 'ddd':
                                return getDayOfYear(valDate) + '';
                            case 'dddd':
                                return pad00(getDayOfYear(valDate) + '');
                        }
                    }
                    else if (cap === 'a') {
                        let val = valDate.getHours();
                        return val < 12 ? locale?.meridiems[0] : locale?.meridiems[1];
                    }
                    else if (cap === 'h') { //12
                        let val = valDate.getHours();
                        val = val % 12;
                        if (val === 0)
                            val = 12;
                        return tag.length > 1 ? pad0(val + '') : val + '';
                    }
                    else if (cap === 'H') { //24
                        const val = valDate.getHours() + '';
                        return tag.length > 1 ? pad0(val) : val;
                    }
                    else if (cap === 'm') {
                        const val = valDate.getMinutes() + '';
                        return tag.length > 1 ? pad0(val) : val;
                    }
                    else if (cap === 's') {
                        const val = valDate.getSeconds() + '';
                        return tag.length > 1 ? pad0(val) : val;
                    }
                    else if (cap === 'Q') {
                        const quarter = Math.ceil(month / 3);
                        if (tag === 'Q')
                            return quarter + '';
                        return locale?.quarters[quarter - 1] || tag;
                    }
                    else if (cap === 'W') {
                        const val = getWeekOfYear(valDate) + '';
                        return tag.length > 1 ? pad0(val) : val;
                    }
                    else if (cap === 'w') {
                        const val = getWeekOfMonth(valDate);
                        if (tag === 'w')
                            return val + '';
                        return locale?.weeks[val - 1] || tag;
                    }
                    else if (cap === 'E') {
                        let dayOfWeek = valDate.getDay();
                        dayOfWeek = dayOfWeek < 1 ? 7 : dayOfWeek;
                        return tag === 'E'
                            ? dayOfWeek + ''
                            : locale?.days[dayOfWeek - 1] || tag;
                    }
                    else if (cap === 'S') {
                        return valDate.getMilliseconds() + '';
                    }
                    return tag;
                });
            };
        }
        return formatter(val);
    }
    const cache$1 = {};
    const Locale = {
        'zh-CN': {
            quarters: ['一季度', '二季度', '三季度', '四季度'],
            months: [
                '一',
                '二',
                '三',
                '四',
                '五',
                '六',
                '七',
                '八',
                '九',
                '十',
                '十一',
                '十二',
            ].map((v) => v + '月'),
            weeks: ['一', '二', '三', '四', '五', '六'].map((v) => '第' + v + '周'),
            days: ['一', '二', '三', '四', '五', '六', '日'].map((v) => '星期' + v),
            meridiems: ['AM', 'PM']
        },
    };
    let Lang = globalThis.navigator?.language || 'zh-CN';
    /**
     * 设置不同locale的配置
     * @param lang 语言标记，默认跟随系统
     * @param {object} options 格式化选项
     * @param options.quarters 季度描述，默认"一 - 四季度"
     * @param options.months 月度描述，默认"一 - 十二月"
     * @param options.weeks 一月中的周描述，默认"第一 - 六周"
     * @param options.days 星期描述，默认"星期一 - 日"
     * @param options.meridiems 上午/下午描述，默认"AM/PM"
     */
    formatDate.locale = function (lang, options) {
        let locale = Locale[lang];
        if (!locale) {
            locale = Locale[lang] = { quarters: [], months: [], weeks: [], days: [], meridiems: [] };
        }
        if (options?.quarters) {
            locale.quarters = options?.quarters;
        }
        if (options?.months) {
            locale.months = options?.months;
        }
        if (options?.weeks) {
            locale.weeks = options?.weeks;
        }
        if (options?.days) {
            locale.days = options?.days;
        }
        if (options?.meridiems) {
            locale.meridiems = options?.meridiems;
        }
    };
    /**
     * 可以设置当前格式化使用的语言
     * @param lang 语言标记，默认跟随系统
     */
    formatDate.lang = function (lang) {
        Lang = lang;
    };

    /**
     * 比较两个日期是否为同一天
     * @example
     * //true
     * console.log(_.isSameDay(new Date('2020-05-01'),'2020/5/1'))
     * //false
     * console.log(_.isSameDay(new Date('2020-05-01 23:59:59.999'),'2020/5/2 0:0:0.000'))
     *
     * @param date1 日期对象或合法格式的日期时间字符串
     * @param date2 同date1
     * @returns
     */
    function isSameDay(date1, date2) {
        return (new Date(date1).setHours(0, 0, 0, 0) ===
            new Date(date2).setHours(0, 0, 0, 0));
    }

    /**
     * 返回13位日期毫秒数，表示从1970 年 1 月 1 日 00:00:00 (UTC)起到当前时间
     *
     * @example
     * //now time
     * console.log(_.now())
     *
     * @returns 带毫秒数的时间戳
     */
    function now() {
        return Date.now();
    }

    var datetime = /*#__PURE__*/Object.freeze({
        __proto__: null,
        addTime: addTime,
        compareDate: compareDate,
        formatDate: formatDate,
        getDayOfYear: getDayOfYear,
        getWeekOfMonth: getWeekOfMonth,
        getWeekOfYear: getWeekOfYear,
        isLeapYear: isLeapYear,
        isSameDay: isSameDay,
        now: now,
        toDate: toDate
    });

    /**
     * 创建一个包含指定函数逻辑且内置计数的包装函数并返回。
     * 该函数每调用一次计数会减一，直到计数为0后生效。可用于异步结果汇总时只调用一次的场景
     *
     * @example
     * //undefined, undefined, 'data saved'
     * let saveTip = _.after(()=>'data saved',2);
     * console.log(saveTip(),saveTip(),saveTip())
     *
     * @param fn 需要调用的函数
     * @param [count=0] 计数
     * @returns 包装后的函数
     */
    function after(fn, count) {
        const proxy = fn;
        let i = count || 0;
        let rtn;
        return ((...args) => {
            if (i === 0) {
                rtn = proxy(...args);
            }
            if (i > 0)
                i--;
            return rtn;
        });
    }

    /**
     * 传递v为参数执行interceptor1函数，如果该函数返回值未定义(undefined)则执行interceptor2函数，并返回函数返回值。
     * 用于函数链中的分支操作
     * @example
     * //false
     * console.log(_.alt(9,v=>false,v=>20))
     *
     * @param v
     * @param interceptor1 (v)
     * @param interceptor2 (v)
     * @returns 函数返回值
     */
    function alt(v, interceptor1, interceptor2) {
        let rs = interceptor1(v);
        if (rs === undefined) {
            rs = interceptor2(v);
        }
        return rs;
    }

    const PLACEHOLDER$1 = void 0;
    /**
     * 创建一个新的函数，该函数会调用fn，并传入指定的部分参数。
     *
     * `partial()`常用来创建函数模板或扩展核心函数，比如
     *
     * ```js
     * let delay2 = _.partial(setTimeout,undefined,2000);
     * delay2(()=>\{console.log('2秒后调用')\})
     * ```
     *
     * @example
     * //2748
     * let hax2num = _.partial(parseInt,undefined,16);
     * console.log(hax2num('abc'))
     * //9
     * let square = _.partial(Math.pow,undefined,2);
     * console.log(square(3))
     * //￥12,345.00元
     * let formatYuan = _.partial(_.formatNumber,undefined,'￥,000.00元');
     * console.log(formatYuan(12345))
     * //[func.js] hi...
     * let log = _.partial((...args)=>args.join(' '),'[func.js][',undefined,']',undefined);
     * console.log(log('info','hi...'))
     *
     * @param fn 需要调用的函数
     * @param args 参数可以使用undefined作为占位符，以此来确定不同的实参位置
     * @returns 部分应用后的新函数
     */
    function partial(fn, ...args) {
        return ((...params) => {
            let p = 0;
            const applyArgs = args.map((v) => (v === PLACEHOLDER$1 ? params[p++] : v));
            if (params.length > p) {
                for (let i = p; i < params.length; i++) {
                    applyArgs.push(params[i]);
                }
            }
            return fn(...applyArgs);
        });
    }

    /**
     * 创建一个新的函数，并且绑定函数的this上下文。默认参数部分同<code>partial()</code>
     *
     * @example
     * const obj = {
     *  text:'Func.js',
     *  click:function(a,b,c){console.log('welcome to '+this.text,a,b,c)},
     *  blur:function(){console.log('bye '+this.text)}
     * }
     * //自动填充参数
     * let click = _.bind(obj.click,obj,'a',undefined,'c');
     * click('hi')
     * //1秒后执行，无参数
     * setTimeout(click,1000)
     *
     * @param fn 需要调用的函数
     * @param thisArg fn函数内this所指向的值
     * @param args 参数可以使用undefined作为占位符，以此来确定不同的实参位置
     * @returns 绑定thisArg的新函数
     * @since 0.17.0
     */
    function bind(fn, thisArg, ...args) {
        return partial((fn || (() => { })).bind(thisArg), ...args);
    }

    /**
     * 通过path设置对象属性值。如果路径不存在则创建，索引会创建数组，属性会创建对象
     * <div class="alert alert-secondary">
          该函数会修改源对象
        </div>

        @example
     * //{"a":1,"b":{"c":[undefined,{"x":10}]}}
     * console.log(_.set({a:1},'b.c.1.x',10))
     *
     * @param obj 需要设置属性值的对象，如果obj不是对象(isObject返回false)，直接返回obj
     * @param path 属性路径，可以是索引数字，字符串key，或者多级属性数组
     * @param value 任何值
     * @returns obj 修改后的源对象
     * @since 0.16.0
     */
    function set(obj, path, value) {
        if (!isObject(obj))
            return obj;
        const chain = toPath$1(path);
        let target = obj;
        for (let i = 0; i < chain.length; i++) {
            const seg = chain[i];
            const nextSeg = chain[i + 1];
            let tmp = target[seg];
            if (nextSeg) {
                let next = !tmp ? (isNaN(parseInt(nextSeg)) ? {} : []) : tmp;
                if (!tmp) {
                    tmp = target[seg] = next;
                }
            }
            else {
                target[seg] = value;
                break;
            }
            target = tmp;
        }
        return obj;
    }

    /**
     * 批量绑定对象内的函数属性，将这些函数的this上下文指向绑定对象。经常用于模型中的函数用于外部场景，比如setTimeout/事件绑定等
     *
     * @example
     * const obj = {
     *  text:'Func.js',
     *  click:function(a,b,c){console.log('welcome to '+this.text,a,b,c)},
     *  click2:function(){console.log('hi '+this.text)}
     * }
     * //自动填充参数
     * _.bindAll(obj,'click',['click2']);
     * //1秒后执行，无参数
     * setTimeout(obj.click,1000)
     * //事件
     * top.onclick = obj.click2
     *
     * @param object 绑定对象
     * @param  {...(string | Array<string>)} methodNames 属性名或path
     * @returns 绑定对象
     * @since 0.17.0
     */
    function bindAll(object, ...methodNames) {
        const pathList = flatDeep(methodNames);
        each(pathList, (path) => {
            const fn = get(object, path);
            set(object, path, fn.bind(object));
        });
        return object;
    }

    /**
     * 通过给定参数调用fn并返回执行结果
     *
     * @example
     * //自动填充参数
     * _.call(fn,1,2);
     * //事件
     * _.call(fn,1,2);
     *
     * @param fn 需要执行的函数
     * @param args 可变参数
     * @returns 执行结果。如果函数无效或无返回值返回undefined
     * @since 1.0.0
     */
    function call(fn, ...args) {
        if (!isFunction(fn))
            return undefined;
        return fn(...args);
    }

    /**
     * 创建一个新的函数，该函数的参数会传递给第一个<code>fns</code>函数来计算结果，而结果又是第二个fns函数的参数，以此类推，
     * 直到所有函数执行完成。常用于封装不同的可重用函数模块组成新的函数或实现惰性计算，比如
     *
     * <pre><code class="language-javascript">
     * let checkName = _.compose(_.trim,v=>v.length>6);
     * checkName(' holyhigh') //=> true
     * checkName(' ') //=> false
     * </code></pre>
     *
     * @example
     * // Holyhigh
     * let formatName = _.compose(_.lowerCase,_.capitalize);
     * console.log(formatName('HOLYHIGH'))
     *
     * @param  {...function} fns
     * @returns 组合后的入口函数
     */
    function compose(...fns) {
        return (function (...args) {
            let rs = fns[0](...args);
            for (let i = 1; i < fns.length; i++) {
                if (isFunction(fns[i])) {
                    rs = fns[i](rs);
                }
            }
            return rs;
        });
    }

    /**
     * 创建一个包含指定函数逻辑的防抖函数并返回。在防抖函数执行后的下一次调用会在 `wait` 间隔结束后执行，如果等待期间调用函数则会重置wait时间。
     * 对于一些需要等待过程停止后执行的场景非常有用，如输入结束时的查询、窗口resize后的计算等等
     *
     * @example
     * //2
     * let log = _.debounce(console.log);
     * console.log(log(1),log(2))
     *
     * @param fn 需要调用的函数
     * @param wait 抖动间隔，ms
     * @param immediate 立即执行一次，默认false
     * @returns 包装后的函数
     * @since 1.4.0
     */
    function debounce(fn, wait, immediate = false) {
        let proxy = fn;
        let timer = null;
        let counting = false;
        if (immediate) {
            return (function (...args) {
                if (!counting)
                    proxy.apply(this, args);
                counting = true;
                clearTimeout(timer);
                timer = setTimeout(() => {
                    counting = false;
                    proxy.apply(this, args);
                }, wait);
            });
        }
        else {
            return (function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    proxy.apply(this, args);
                }, wait);
            });
        }
    }

    /**
     * 启动计时器，并在倒计时为0后调用函数。
     * 内部使用setTimeout进行倒计时，如需中断延迟可以使用clearTimeout函数。*注意，该函数并不提供防抖逻辑*
     *
     * @example
     * //1000ms 后显示some text !
     * _.delay(console.log,1000,'some text','!');
     *
     * @param fn 需要调用的函数
     * @param [wait=0] 倒计时。单位ms
     * @param [args] 传入定时函数的参数
     * @returns 计时器id
     */
    function delay(fn, wait, ...args) {
        return setTimeout(() => {
            fn(...args);
        }, wait || 0);
    }

    /**
     * 类似eval，对表达式进行求值并返回结果。不同于eval，fval()执行在严格模式下
     *
     * > 注意，如果页面设置了<a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP">CSP</a>可能会导致该函数失效
     *
     * @example
     * //5
     * console.log(_.fval('3+2'));
     * //{name:"func.js"}
     * console.log(_.fval("{name:'func.js'}"));
     * //0
     * console.log(_.fval('1+x-b',{x:2,b:3}))
     *
     * @param expression 计算表达式
     * @param args 可选参数对象
     * @param context 可选上下文
     * @returns 表达式计算结果
     */
    function fval(expression, args, context) {
        const ks = args ? keys(args) : [];
        const val = args ? values(args) : [];
        return Function(...ks, '"use strict";return ' + expression).call(context, ...val);
    }

    /**
     * 创建一个包含指定函数逻辑的包装函数并返回。该函数仅执行一次
     *
     * @example
     * //2748, undefined
     * let parseInt2 = _.once(parseInt);
     * console.log(parseInt2('abc',16),parseInt2('abc',16))
     *
     * @param fn 需要调用的函数
     * @returns 包装后的函数
     */
    function once(fn) {
        let proxy = fn;
        return ((...args) => {
            let rtn;
            if (proxy) {
                let m = proxy;
                proxy = null;
                rtn = m(...args);
            }
            return rtn;
        });
    }

    /**
     * 传递v为参数执行interceptor函数，然后返回v。常用于函数链的过程调试，比如在filter后执行日志操作
     * <p>
     * 注意，一旦函数链执行了shortcut fusion，tap函数的执行会延迟到一个数组推导完成后执行
     * </p>
     *
     * @example
     * //shortut fusion中的tap只保留最后一个
     * _([1,2,3,4])
     * .map(v=>v*3).tap(v=>console.log(v))//被覆盖
     * .filter(v=>v%2===0).tap(v=>console.log(v))//会延迟，并输出结果[6,12]
     * .join('-')
     * .value()
     *
     * @param v
     * @param interceptor (v);如果v是引用值，改变v将影响后续函数流
     * @returns v
     */
    function tap(v, interceptor) {
        interceptor(v);
        return v;
    }

    /**
     * 创建一个包含指定函数逻辑的节流函数并返回。每当节流函数执行后都会等待`wait`间隔归零才可再次调用，等待期间调用函数无效。
     * 对于一些需要降低执行频率的场景非常有用，如onmousemove、onscroll等事件中
     *
     * @example
     * //每隔1秒输出当前时间
     * let log = _.throttle(console.log,1000);
     * setInterval(()=>log(new Date().toTimeString()),100)
     *
     * @param fn 需要调用的函数
     * @param wait 抖动间隔，ms
     * @param options 执行选项
     * @param options.leading 首次是否执行，默认true
     * @param options.trailing 最后一次是否执行，默认true
     * @returns 包装后的函数
     * @since 1.4.0
     */
    const EventTargetMap = new WeakMap;
    function throttle(fn, wait, options) {
        let proxy = fn;
        let lastExec = 0;
        let timer = null;
        let timeoutArgs;
        let timeoutContext;
        options = options || { leading: true, trailing: true };
        options.leading = options.leading === undefined ? true : options.leading;
        options.trailing = options.trailing === undefined ? true : options.trailing;
        function timeout() {
            if (options?.trailing) {
                for (const arg of timeoutArgs) {
                    if (EventTargetMap.has(arg)) {
                        let targets = EventTargetMap.get(arg);
                        let ks = Object.keys(targets);
                        for (const k of ks) {
                            Object.defineProperty(arg, k, {
                                value: targets[k],
                                writable: false,
                                enumerable: true,
                                configurable: false
                            });
                        }
                        EventTargetMap.delete(arg);
                    }
                }
                proxy.apply(timeoutContext, timeoutArgs);
            }
            lastExec = Date.now();
            timeoutArgs = timer = null;
        }
        return (function (...args) {
            timeoutArgs = args.map(arg => {
                if (arg instanceof globalThis.Event) {
                    EventTargetMap.set(arg, {
                        currentTarget: arg.currentTarget,
                        fromElement: Reflect.get(arg, 'fromElement'),
                        relatedTarget: Reflect.get(arg, 'relatedTarget'),
                        target: arg.target,
                        toElement: Reflect.get(arg, 'toElement'),
                    });
                }
                return arg;
            });
            timeoutContext = this;
            let now = Date.now();
            let remaining = wait - (now - lastExec);
            if (remaining <= 0) {
                if (timer) {
                    clearTimeout(timer);
                    timeoutArgs = timer = null;
                }
                if (options?.leading) {
                    proxy.apply(this, args);
                }
                lastExec = now;
            }
            else if (!timer) {
                timer = setTimeout(timeout, remaining);
            }
        });
    }

    var functions$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        after: after,
        alt: alt,
        bind: bind,
        bindAll: bindAll,
        call: call,
        compose: compose,
        debounce: debounce,
        delay: delay,
        fval: fval,
        once: once,
        partial: partial,
        tap: tap,
        throttle: throttle
    });

    /**
     * 对字符串进行trim后进行验证。如果非字符串，转为字符串后进行验证
     * @example
     * //true
     * console.log(_.isBlank('  '))
     * //true
     * console.log(_.isBlank(null))
     * //false
     * console.log(_.isBlank({}))
     * //false
     * console.log(_.isBlank('     1'))
     *
     * @param v 字符串
     * @returns 如果字符串是null/undefined/\t \n \f \r或trim后长度为0，返回true
     * @since 0.16.0
     */
    function isBlank(v) {
        return v === null || v === undefined || (v + '').trim().replace(/\t|\n|\f|\r/mg, '').length === 0;
    }

    /**
     * 判断值是不是一个布尔值
     *
     * @example
     * //true
     * console.log(_.isBoolean(false))
     * //false
     * console.log(_.isBoolean('true'))
     * //false
     * console.log(_.isBoolean(1))
     *
     * @param v
     * @returns
     */
    function isBoolean(v) {
        return v instanceof Boolean || Object.prototype.toString.call(v) === '[object Boolean]';
    }

    /**
     * isUndefined()的反向验证函数，在需要验证是否变量存在的场景下非常有用
     * @example
     * //true
     * console.log(_.isDefined(null))
     * //false
     * console.log(_.isDefined(undefined))
     *
     * @param v
     * @returns
     */
    function isDefined(v) {
        return v !== undefined;
    }

    /**
     * 判断值是不是Element的实例
     *
     * @example
     * //true
     * console.log(_.isElement(document.body))
     * //false
     * console.log(_.isElement(document))
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function isElement(v) {
        return typeof v === 'object' && v instanceof (globalThis.Element || Object);
    }

    /**
     * 判断参数是否为空，包括`null/undefined/空字符串/0/[]/{}`都表示空
     *
     * 注意：相比isBlank，isEmpty只判断字符串长度是否为0
     *
     * @example
     * //true
     * console.log(_.isEmpty(null))
     * //true
     * console.log(_.isEmpty([]))
     * //false
     * console.log(_.isEmpty({x:1}))
     *
     * @param v
     * @returns
     */
    function isEmpty(v) {
        if (null === v)
            return true;
        if (undefined === v)
            return true;
        if ('' === v)
            return true;
        if (0 === v)
            return true;
        if (isArrayLike(v) && v.length < 1)
            return true;
        if (v instanceof Object && Object.keys(v).length < 1)
            return true;
        return false;
    }

    /**
     * 判断值是不是一个正则对象
     *
     * @example
     * //true
     * console.log(_.isRegExp(new RegExp))
     * //true
     * console.log(_.isRegExp(/1/))
     *
     * @param v
     * @returns
     * @since 0.19.0
     */
    function isRegExp(v) {
        return v instanceof RegExp || Object.prototype.toString.call(v) === '[object RegExp]';
    }

    /**
     * 同<code>isEqual</code>，但支持自定义比较器。如果未指定比较器则使用内置逻辑处理
     * 内置逻辑:
     *  - 如果是日期使用getTime对比
     *  - 如果是正则使用toString对比
     *  - 如果是元素节点使用tagName+id+class对比
     *  - 如果是函数使用name对比
     * @example
     * //true
     * console.log(_.isEqualWith([new Date('2010-2-1'),'abcd'],['2010/2/1','Abcd'],(av,bv)=>_.isDate(av)?av.toLocaleDateString() == bv:_.test(av,bv,'i')))
     *
     * @param a
     * @param b
     * @param [comparator] 比较器，参数(v1,v2)，返回true表示匹配。如果返回undefined使用对应内置比较器处理
     * @returns
     * @since 1.0.0
     */
    function isEqualWith(a, b, comparator) {
        let cptor = comparator;
        if (!isObject(a) || !isObject(b)) {
            return (cptor || eq$1)(a, b);
        }
        let keys = [];
        if ((keys = Object.keys(a)).length !== Object.keys(b).length)
            return false;
        if (isDate(a) && isDate(b))
            return cptor ? cptor(a, b) : a.getTime() === b.getTime();
        if (isRegExp(a) && isRegExp(b))
            return cptor ? cptor(a, b) : a.toString() === b.toString();
        if (isElement(a) && isElement(b)) {
            let ea = `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}` + Array.from(a.classList.values()).reduce((acc, v) => acc + '.' + v, '');
            let eb = `${b.tagName.toLowerCase()}${b.id ? '#' + b.id : ''}` + Array.from(b.classList.values()).reduce((acc, v) => acc + '.' + v, '');
            return cptor ? cptor(a, b) : ea === eb;
        }
        if (isFunction(a) && isFunction(b))
            return cptor ? cptor(a, b) : a.name === b.name;
        for (let i = keys.length; i--;) {
            const k = keys[i];
            const v1 = a[k], v2 = b[k];
            if (!isEqualWith(v1, v2, cptor)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 判断两个值是否相等，对于非基本类型会进行深度比较，可以比较日期/正则/数组/对象等
     *
     * @example
     * //false
     * console.log(_.isEqual(1,'1'))
     * //true,false
     * let o = {a:1,b:[2,{c:['3','x']}]}
     * let oo = {a:1,b:[2,{c:['3','x']}]}
     * console.log(_.isEqual(o,oo),o == oo)
     * //true
     * console.log(_.isEqual([new Date('2010-2-1'),/12/],[new Date(1264953600000),new RegExp('12')]))
     * //false
     * console.log(_.isEqual([new Date('2010-2-1'),'abcd'],['2010/2/1','Abcd']))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function isEqual(a, b) {
        return isEqualWith(a, b);
    }

    /**
     * 判断值是不是异常对象
     *
     * @example
     * //true
     * console.log(_.isError(new TypeError))
     * //false
     * console.log(_.isError(Error))
     * //true
     * try{a=b}catch(e){console.log(_.isError(e))}
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function isError(v) {
        return v instanceof Error || Object.prototype.toString.call(v) === '[object Error]';
    }

    /**
     * 判断值是不是有限数字
     *
     * @example
     * //false
     * console.log(_.isFinite('0'))
     * //true
     * console.log(_.isFinite(0))
     * //true
     * console.log(_.isFinite(Number.MAX_VALUE))
     * //true
     * console.log(_.isFinite(99999999999999999999999999999999999999999999999999999999999999999999999))
     * //false
     * console.log(_.isFinite(Infinity))
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function isFinite(v) {
        return Number.isFinite(v);
    }

    /**
     * 判断参数是否为小写字母
     * @example
     * //false
     * console.log(_.isLowerCaseChar('A'))
     * //true
     * console.log(_.isLowerCaseChar('a'))
     * //false
     * console.log(_.isLowerCaseChar(null))
     *
     * @param v
     * @returns
     */
    function isLowerCaseChar(v) {
        if (v === null || v === undefined || Number.isNaN(v))
            return false;
        const code = (v + '').charCodeAt(0);
        return code >= 97 && code <= 122;
    }

    /**
     * 判断值是否NaN本身。与全局isNaN函数相比，只有NaN值本身才会返回true
     * <p>
     * isNaN(undefined) => true <br>
     * _.isNaN(undefined) => false
     * </p>
     *
     * @example
     * //true
     * console.log(_.isNaN(NaN))
     * //false
     * console.log(_.isNaN(null))
     * //false
     * console.log(_.isNaN(undefined))
     *
     * @param v
     * @returns
     */
    function isNaN$1(v) {
        return Number.isNaN(v);
    }

    /**
     * 判断参数是否为本地函数
     *
     * @example
     * //true
     * console.log(_.isNative(Array))
     * //false
     * console.log(_.isNative(()=>{}))
     *
     * @param v
     * @returns
     */
    function isNative(v) {
        return typeof v === 'function' && /native code/.test(v.toString());
    }

    /**
     * 判断参数是否为null
     *
     * @example
     * //true
     * console.log(_.isNull(null))
     * //false
     * console.log(_.isNull(undefined))
     *
     * @param v
     * @returns
     */
    function isNull(v) {
        return null === v;
    }

    /**
     * 判断参数是否为数字或数字字符串。不能判断BigInt
     *
     * @example
     * //true
     * console.log(_.isNumeric(1))
     * //true
     * console.log(_.isNumeric('-1.1'))
     * //false
     * console.log(_.isNumber('-1.1a'))
     *
     * @param v
     * @returns
     */
    function isNumeric(v) {
        if ((v + '').length < 1)
            return false;
        if (isNil(v))
            return false;
        if (Number.isNaN(v))
            return false;
        if (isNumber(v))
            return true;
        return /^-?[0-9]*\.?[0-9]+$/.test(v + '');
    }

    /**
     * 判断值是不是一个朴素对象，即通过Object创建的对象
     *
     * @example
     * //false
     * console.log(_.isPlainObject(1))
     * //false
     * console.log(_.isPlainObject(new String()))
     * //true
     * console.log(_.isPlainObject({}))
     * //false
     * console.log(_.isPlainObject(null))
     * //true
     * console.log(_.isPlainObject(new Object))
     * function Obj(){}
     * //false
     * console.log(_.isPlainObject(new Obj))
     *
     * @param v value
     * @returns 是否朴素对象
     * @since 0.19.0
     */
    function isPlainObject(v) {
        return isObject(v) && v.constructor === Object.prototype.constructor;
    }

    /**
     * 判断参数是否为原始类型
     *
     * @example
     * //true
     * console.log(_.isPrimitive(1))
     * //true
     * console.log(_.isPrimitive(null)
     * //false
     * console.log(_.isPrimitive(new String()))
     * //true
     * console.log(_.isPrimitive(123n)
     *
     * @param v
     * @returns
     */
    function isPrimitive(v) {
        return null === v || PRIMITIVE_TYPES.indexOf(typeof v) > -1;
    }

    /**
     * 判断值是不是一个安全整数
     *
     * @example
     * //true
     * console.log(_.isSafeInteger(-0))
     * //true
     * console.log(_.isSafeInteger(5.0))
     * //false
     * console.log(_.isSafeInteger(5.000000000000001))
     * //true
     * console.log(_.isSafeInteger(5.0000000000000001))
     * //false
     * console.log(_.isSafeInteger('5'))
     * //true
     * console.log(_.isSafeInteger(Number.MAX_SAFE_INTEGER))
     * //false
     * console.log(_.isSafeInteger(Number.MAX_VALUE))
     *
     * @param v
     * @returns
     */
    function isSafeInteger(v) {
        return Number.isSafeInteger(v);
    }

    /**
     * 判断值是不是Symbol
     *
     * @example
     * //true
     * console.log(_.isSymbol(Symbol()))
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function isSymbol(v) {
        return typeof v === 'symbol';
    }

    /**
     * 判断参数是否为大写字母
     * @example
     * //true
     * console.log(_.isUpperCaseChar('A'))
     * //false
     * console.log(_.isUpperCaseChar(null))
     *
     * @param v
     * @returns
     */
    function isUpperCaseChar(v) {
        if (v === null || v === undefined || Number.isNaN(v))
            return false;
        const code = (v + '').charCodeAt(0);
        return code >= 65 && code <= 90;
    }

    /**
     * 判断值是不是一个WeakMap对象
     *
     * @example
     * //true
     * console.log(_.isWeakMap(new WeakMap))
     * //false
     * console.log(_.isWeakMap(new Map))
     *
     * @param v
     * @returns
     */
    function isWeakMap(v) {
        return v instanceof WeakMap || Object.prototype.toString.call(v) === '[object WeakMap]';
    }

    /**
     * 判断值是不是一个WeakSet对象
     *
     * @example
     * //true
     * console.log(_.isWeakSet(new WeakSet))
     * //false
     * console.log(_.isWeakSet(new Set))
     *
     * @param v
     * @returns
     */
    function isWeakSet(v) {
        return v instanceof WeakSet || Object.prototype.toString.call(v) === '[object WeakSet]';
    }

    var is = /*#__PURE__*/Object.freeze({
        __proto__: null,
        isArray: isArray,
        isArrayLike: isArrayLike,
        isBlank: isBlank,
        isBoolean: isBoolean,
        isDate: isDate,
        isDefined: isDefined,
        isElement: isElement,
        isEmpty: isEmpty,
        isEqual: isEqual,
        isEqualWith: isEqualWith,
        isError: isError,
        isFinite: isFinite,
        isFunction: isFunction,
        isInteger: isInteger,
        isIterator: isIterator,
        isLowerCaseChar: isLowerCaseChar,
        isMap: isMap,
        isMatch: isMatch,
        isMatchWith: isMatchWith,
        isNaN: isNaN$1,
        isNative: isNative,
        isNil: isNil,
        isNode: isNode,
        isNull: isNull,
        isNumber: isNumber,
        isNumeric: isNumeric,
        isObject: isObject,
        isPlainObject: isPlainObject,
        isPrimitive: isPrimitive,
        isRegExp: isRegExp,
        isSafeInteger: isSafeInteger,
        isSet: isSet,
        isString: isString,
        isSymbol: isSymbol,
        isUndefined: isUndefined,
        isUpperCaseChar: isUpperCaseChar,
        isWeakMap: isWeakMap,
        isWeakSet: isWeakSet
    });

    /**
     * a + b
     * @example
     * //3
     * console.log(_.add(1,2))
     * //1
     * console.log(_.add(1,null))
     * //NaN
     * console.log(_.add(1,NaN))
     *
     * @param a
     * @param b
     * @returns a+b
     * @since 1.0.0
     */
    function add(a, b) {
        a = isNil(a) ? 0 : a;
        b = isNil(b) ? 0 : b;
        return a + b;
    }

    /**
     * a / b
     * @example
     * //0.5
     * console.log(_.divide(1,2))
     * //Infinity
     * console.log(_.divide(1,null))
     * //NaN
     * console.log(_.divide(1,NaN))
     *
     * @param a
     * @param b
     * @returns a/b
     * @since 1.0.0
     */
    function divide(a, b) {
        a = isNil(a) ? 0 : a;
        b = isNil(b) ? 0 : b;
        return a / b;
    }

    /**
     * 返回给定数字序列中最大的一个。忽略NaN，null，undefined
     * @example
     * //7
     * console.log(_.max([2,3,1,NaN,7,4,null]))
     * //6
     * console.log(_.max([4,5,6,'x','y']))
     * //Infinity
     * console.log(_.max([4,5,6,Infinity]))
     *
     * @param values 数字/字符数组/Set
     * @returns
     * @since 1.0.0
     */
    function max(values) {
        if (!isArray(values) && !isSet(values))
            return NaN;
        let rs = isArray(values) ? values[0] : values.values().next().value;
        values.forEach(v => {
            if (isNumeric(v) && v > rs) {
                rs = v;
            }
        });
        return Number(rs);
    }

    /**
     * 对多个数字或数字列表计算平均值并返回结果
     * @example
     * //2.5
     * console.log(_.mean([1,2,'3',4]))
     * //NaN
     * console.log(_.mean([1,'2',3,'a',4]))
     * //2
     * console.log(_.mean([1,'2',3,null,4]))
     *
     * @param values 数字/字符数组/Set
     * @returns mean value
     * @since 1.0.0
     */
    function mean(values) {
        if (!isArray(values) && !isSet(values))
            return NaN;
        let total = 0;
        let len = 0;
        values.forEach(v => {
            if (isNumeric(v)) {
                total += Number(v);
                len++;
            }
        });
        return total / len;
    }

    /**
     * 对多个数字或数字列表计算中间值并返回结果
     * @example
     * //2.5
     * console.log(_.median([1,2,'3',4]))
     * //2
     * console.log(_.median([1,'2',3]))
     * //1
     * console.log(_.median([1,'2',-3]))
     *
     * @param values 数字/字符数组/Set
     * @returns mean value
     * @since 1.12.0
     */
    function median(values) {
        if (!isArray(values) && !isSet(values))
            return NaN;
        let sortNumbers = [];
        values.forEach(v => {
            if (isNumeric(v)) {
                sortNumbers.push(Number(v));
            }
        });
        sortNumbers.sort();
        let rs;
        if (sortNumbers.length % 2 === 0) {
            let i = sortNumbers.length / 2 - 1;
            rs = (sortNumbers[i] + sortNumbers[i + 1]) / 2;
        }
        else {
            rs = sortNumbers[Math.ceil(sortNumbers.length / 2) - 1];
        }
        return rs;
    }

    /**
     * 返回给定数字序列中最小的一个。忽略NaN，null，undefined
     * @example
     * //-1
     * console.log(_.min([2,3,1,7,'-1']))
     * //0
     * console.log(_.min([4,3,6,0,'x','y']))
     * //-Infinity
     * console.log(_.min([-Infinity,-9999,0,null]))
     * @param values 数字/字符数组/Set
     * @returns 如果参数不是数组/Set，返回NaN
     * @since 1.0.0
     */
    function min(values) {
        if (!isArray(values) && !isSet(values))
            return NaN;
        let rs = isArray(values) ? values[0] : values.values().next().value;
        values.forEach(v => {
            if (isNumeric(v) && v < rs) {
                rs = v;
            }
        });
        return Number(rs);
    }

    /**
     * 返回min/max如果value超出范围
     * @example
     * //1
     * console.log(_.minmax([1,10,0]))
     * //6
     * console.log(_.minmax([4,8,6]))
     *
     * @param min
     * @param max
     * @param value
     * @returns
     */
    function minmax(min, max, value) {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    }

    /**
     * a * b
     * @example
     * //2
     * console.log(_.multiply(1,2))
     * //0
     * console.log(_.multiply(1,null))
     * //NaN
     * console.log(_.multiply(1,NaN))
     *
     * @param a
     * @param b
     * @returns a*b
     * @since 1.0.0
     */
    function multiply(a, b) {
        a = isNil(a) ? 0 : a;
        b = isNil(b) ? 0 : b;
        return a * b;
    }

    function randf(min, max) {
        if (max === undefined) {
            if (!min)
                return Math.random();
            max = min;
            min = 0;
        }
        max = parseFloat(max + '') || 0;
        min = parseFloat(min + '') || 0;
        return Math.random() * (max - min) + min;
    }

    /**
     * a - b
     * @example
     * //-1
     * console.log(_.subtract(1,2))
     * //1
     * console.log(_.subtract(1,null))
     * //NaN
     * console.log(_.subtract(1,NaN))
     *
     * @param a
     * @param b
     * @returns a - b
     * @since 1.0.0
     */
    function subtract(a, b) {
        a = isNil(a) ? 0 : a;
        b = isNil(b) ? 0 : b;
        return a - b;
    }

    /**
     * 对字符/数字数组/Set进行求和并返回结果
     * - 对nil值，自动转为0
     * - 对NaN值，返回NaN
     * - 对Infinity值，返回Infinity
     *
     * @example
     * //10
     * console.log(_.sum([1,'2',3,4]))
     * //10
     * console.log(_.sum([1,'2',3,4,null,undefined]))
     * //9
     * console.log(_.sum([NaN,'2',3,4]))
     * //Infinity
     * console.log(_.sum([Infinity,'2',3,4]))
     * //6
     * console.log(_.sum(new Set([1,2,3])))
     *
     * @param values 数字/字符数组/Set
     * @since 1.0.0
     * @returns
     */
    function sum(values) {
        if (!isArray(values) && !isSet(values))
            return NaN;
        let total = 0;
        values.forEach(v => {
            if (isNumeric(v)) {
                total += Number(v);
            }
        });
        return total;
    }

    var math = /*#__PURE__*/Object.freeze({
        __proto__: null,
        add: add,
        divide: divide,
        max: max,
        mean: mean,
        median: median,
        min: min,
        minmax: minmax,
        multiply: multiply,
        randf: randf,
        randi: randi,
        subtract: subtract,
        sum: sum
    });

    /**
     * 通过表达式格式化数字
     *
     * ```
     * #,##0.00 => 1,234.00
     * ```
     *
     * pattern解释：
     *
     * - `0` 如果对应位置上没有数字，则用零代替。用于整数位时在位数不足时补0，用于小数位时，如果超长会截取限位并四舍五入；如果位数不足则补0
     * - `#` 如果对应位置上没有数字，不显示。用于整数位时在位数不足时原样显示，用于小数位时，如果超长会截取限位并四舍五入；如果位数不足原样显示
     * - `.` 小数分隔符，只能出现一个
     * - `,` 分组符号，如果出现多个分组符号，以最右侧为准
     * - `%` 后缀符号，数字乘100，并追加%
     * - `\u2030` 后缀符号，数字乘1000，并追加‰
     * - `E` 后缀符号，转为科学计数法格式
     *
     * @example
     * //小数位截取时会自动四舍五入
     * console.log(_.formatNumber(123.678,'0.00'))
     * //在整数位中，0不能出现在#左侧；在小数位中，0不能出现在#右侧。
     * console.log(_.formatNumber(12.1,'0##.#0')) //格式错误，返回原值
     * //当有分组出现时，0只会影响短于表达式的数字
     * console.log(_.formatNumber(12.1,',000.00'))//012.10
     * console.log(_.formatNumber(1234.1,',000.00'))//1,234.10
     * //非表达式字符会原样保留
     * console.log(_.formatNumber(1234.1,'￥,000.00元'))//￥1,234.10元
     * //转为科学计数法
     * console.log(_.formatNumber(-0.01234,'##.0000E'))//-1.2340e-2
     * //#号在小数位中会限位，整数位中不会
     * console.log(_.formatNumber(123.456,'#.##'))//123.46
     *
     * @param v 需要格式化的值，可以是数字或字符串类型
     * @param [pattern='#,##0.00'] 格式化模式
     *
     * @returns 格式化后的字符串或原始值字符串(如果格式无效时)或特殊值(Infinity\u221E、NaN\uFFFD)
     */
    function formatNumber(v, pattern = '#,##0.00') {
        if (v === Infinity)
            return '\u221E';
        if (v === -Infinity)
            return '-\u221E';
        if (Number.isNaN(v))
            return '\uFFFD';
        if (isNaN(parseFloat(v + '')))
            return v + '';
        let formatter = cache[pattern];
        if (!formatter) {
            const match = pattern.match(/(?<integer>[0,#]+)(?:\.(?<fraction>[0#]+))?(?<suffix>[%\u2030E])?/);
            if (match == null) {
                return v + '';
            }
            let integerPtn = match.groups?.integer || '';
            const fractionPtn = match.groups?.fraction || '';
            let suffix = match.groups?.suffix || '';
            if (!integerPtn ||
                integerPtn.indexOf('0#') > -1 ||
                fractionPtn.indexOf('#0') > -1)
                return v + '';
            const ptnPart = match[0];
            const endsPart = pattern.split(ptnPart);
            const rnd = true; // round
            const isPercentage = suffix === '%';
            const isPermillage = suffix === '\u2030';
            const isScientific = suffix === 'E';
            const groupMatch = integerPtn.match(/,[#0]+$/);
            let groupLen = -1;
            if (groupMatch) {
                groupLen = groupMatch[0].substring(1).length;
                integerPtn = integerPtn.replace(/^.*,(?=[^,])/, '');
            }
            let zeroizeLen = integerPtn.indexOf('0');
            if (zeroizeLen > -1) {
                zeroizeLen = integerPtn.length - zeroizeLen;
            }
            let fixedLen = Math.max(fractionPtn.lastIndexOf('0'), fractionPtn.lastIndexOf('#'));
            if (fixedLen > -1) {
                fixedLen += 1;
            }
            formatter = (val) => {
                const num = parseFloat(val + '');
                let number = num;
                let exponent = 0;
                if (isPercentage) {
                    number = number * 100;
                }
                else if (isPermillage) {
                    number = number * 1000;
                }
                else if (isScientific) {
                    const str = number + '';
                    const pair = str.split('.');
                    if (number >= 1) {
                        exponent = pair[0].length - 1;
                    }
                    else if (number < 1) {
                        const fraStr = pair[1];
                        exponent = fraStr.replace(/^0+/, '').length - fraStr.length - 1;
                    }
                    number = number / 10 ** exponent;
                }
                const numStr = number + '';
                let integer = parseInt(numStr);
                const pair = numStr.split('.');
                const fraction = pair[1] || '';
                // 处理小数
                let dStr = '';
                if (fractionPtn) {
                    if (fraction.length >= fixedLen) {
                        dStr = parseFloat('0.' + fraction).toFixed(fixedLen);
                        if (dStr[0] === '1') {
                            integer += 1;
                        }
                        dStr = dStr.substring(1);
                    }
                    else {
                        dStr =
                            '.' +
                            fractionPtn.replace(/[0#]/g, (tag, i) => {
                                const l = fraction[i];
                                return l == undefined ? (tag === '0' ? '0' : '') : l;
                            });
                    }
                    if (dStr.length < 2) {
                        dStr = '';
                    }
                }
                else {
                    let carry = 0;
                    if (fraction && rnd) {
                        carry = Math.round(parseFloat('0.' + fraction));
                    }
                    integer += carry;
                }
                // 处理整数
                let iStr = integer + '';
                let sym = num < 0 ? '-' : '';
                if (iStr[0] === '-' || iStr[0] === '+') {
                    sym = iStr[0];
                    iStr = iStr.substring(1);
                }
                if (groupLen > -1 && iStr.length > groupLen) {
                    const reg = new RegExp('\\B(?=(\\d{' + groupLen + '})+$)', 'g');
                    iStr = iStr.replace(reg, ',');
                }
                else if (iStr.length < integerPtn.length) {
                    const integerPtnLen = integerPtn.length;
                    const iStrLen = iStr.length;
                    iStr = integerPtn.replace(/[0#]/g, (tag, i) => {
                        if (integerPtnLen - i > iStrLen)
                            return tag === '0' ? '0' : '';
                        const l = iStr[iStrLen - (integerPtnLen - i)];
                        return l == undefined ? (tag === '0' ? '0' : '') : l;
                    });
                }
                // 合并
                if (isScientific) {
                    suffix = 'e' + exponent;
                }
                let rs = sym + iStr + dStr + suffix;
                return (endsPart[0] || '') + rs + (endsPart[1] || '');
            };
        }
        return formatter(v);
    }
    const cache = {};

    /**
     * 判断a是否大于b
     *
     * @example
     * //true
     * console.log(_.gt(2,1))
     * //false
     * console.log(_.gt(5,'5'))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function gt(a, b) {
        return toNumber(a) > toNumber(b);
    }

    /**
     * 判断a是否大于等于b
     *
     * @example
     * //true
     * console.log(_.gte(2,1))
     * //true
     * console.log(_.gte(5,'5'))
     * //false
     * console.log(_.gte(5,'b'))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function gte(a, b) {
        return toNumber(a) >= toNumber(b);
    }

    /**
     * 判断a是否小于b
     *
     * @example
     * //true
     * console.log(_.lt(1,2))
     * //false
     * console.log(_.lt(5,'5'))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function lt(a, b) {
        return toNumber(a) < toNumber(b);
    }

    function inRange(v, start, end) {
        start = start || 0;
        if (end === undefined) {
            end = start;
            start = 0;
        }
        if (start > end) {
            const tmp = end;
            end = start;
            start = tmp;
        }
        return gte(v, start) && lt(v, end);
    }

    /**
     * 判断a是否小于等于b
     *
     * @example
     * //true
     * console.log(_.lte(1,2))
     * //true
     * console.log(_.lte(5,'5'))
     * //false
     * console.log(_.lte(5,'b'))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function lte(a, b) {
        return toNumber(a) <= toNumber(b);
    }

    /**
     * 转换整数。小数部分会直接丢弃
     *
     * @example
     * //9
     * console.log(_.toInteger(9.99))
     * //12
     * console.log(_.toInteger('12.34'))
     * //0
     * console.log(_.toInteger(null))
     * //0
     * console.log(_.toInteger(new Error))
     *
     * @param v
     * @returns
     * @since 1.0.0
     */
    function toInteger(v) {
        if (v === null || v === undefined)
            return 0;
        return parseInt(v);
    }

    var num = /*#__PURE__*/Object.freeze({
        __proto__: null,
        formatNumber: formatNumber,
        gt: gt,
        gte: gte,
        inRange: inRange,
        lt: lt,
        lte: lte,
        toInteger: toInteger,
        toNumber: toNumber
    });

    function checkTarget(target) {
        if (target === null || target === undefined)
            return {};
        if (!isObject(target))
            return new target.constructor(target);
        if (!Object.isExtensible(target) ||
            Object.isFrozen(target) ||
            Object.isSealed(target)) {
            return target;
        }
    }

    function eachSources(target, sources, handler, afterHandler) {
        sources.forEach((src) => {
            if (!isObject(src))
                return;
            Object.keys(src).forEach((k) => {
                let v = src[k];
                if (handler) {
                    v = handler(src[k], target[k], k, src, target);
                }
                afterHandler(v, src[k], target[k], k, src, target);
            });
        });
    }

    /**
     * 与<code>assign</code>相同，但支持自定义处理器
     *
     * > 该函数会修改目标对象
     *
     * @example
     * //{x: 1, y: '3y', z: null}
     * console.log(_.assignWith({x:1},{y:3,z:4},(sv,tv,k)=>k=='z'?null:sv+k))
     *
     * @param target 目标对象
     * @param sources 源对象，可变参数。最后一个参数为函数时，签名为(src[k],target[k],k,src,target) 自定义赋值处理器，返回赋予target[k]的值
     * @returns 返回target
     */
    function assignWith(target, ...sources) {
        const rs = checkTarget(target);
        if (rs)
            return rs;
        let src = sources;
        const sl = sources.length;
        let handler = src[sl - 1];
        if (!handler || !handler.call) {
            handler = identity;
        }
        else {
            src = src.slice(0, sl - 1);
        }
        eachSources(target, src, handler, (v, sv, tv, k, s, t) => {
            t[k] = v;
        });
        return target;
    }

    /**
     * 将一个或多个源对象的可枚举属性值分配到目标对象。如果源对象有多个，则按照从左到右的顺序依次对target赋值，相同属性会被覆盖
     *
     * > 该函数会修改目标对象
     *
     * <ul>
     *  <li>当目标对象是null/undefined时，返回空对象</li>
     *  <li>当目标对象是基本类型时，返回对应的包装对象</li>
     *  <li>当目标对象是不可扩展/冻结/封闭状态时，返回目标对象</li>
     * </ul>
     * @example
     * //{x:1,y:3}
     * console.log(_.assign({x:1},{y:3}))
     *
     * @param target 目标对象
     * @param  {...object} sources 源对象
     * @returns 返回target
     */
    function assign(target, ...sources) {
        return assignWith(target, ...sources, identity);
    }

    function cloneBuiltInObject(obj) {
        let rs = null;
        if (isDate(obj)) {
            rs = new Date(obj.getTime());
        }
        else if (isBoolean(obj)) {
            rs = new Boolean(obj.valueOf());
        }
        else if (isString(obj)) {
            rs = new String(obj);
        }
        else if (isRegExp(obj)) {
            rs = new RegExp(obj);
        }
        else if (isNumber(obj)) {
            rs = new Number(obj);
        }
        else if (isSet(obj)) {
            rs = new Set(obj);
        }
        else if (isMap(obj)) {
            rs = new Map(obj);
        }
        return rs;
    }

    function cloneWith(obj, handler, skip = (value, key) => false) {
        if (!isObject(obj))
            return obj;
        if (isFunction(obj))
            return obj;
        if (isElement(obj))
            return obj;
        let copy = cloneBuiltInObject(obj);
        if (copy !== null)
            return copy;
        copy = new obj.constructor();
        const propNames = Object.keys(obj);
        propNames.forEach((p) => {
            let skipTag = skip(obj[p], p);
            if (skipTag)
                return;
            let newProp = (handler || identity)(obj[p], p);
            try {
                // maybe unwritable
                ;
                copy[p] = newProp;
            }
            catch (e) { }
        });
        return copy;
    }

    function clone(obj) {
        return cloneWith(obj, identity);
    }

    function cloneDeepWith(obj, handler, skip = (value, key) => false) {
        if (!isObject(obj))
            return obj;
        if (isFunction(obj))
            return obj;
        if (isElement(obj))
            return obj;
        let copy = cloneBuiltInObject(obj);
        if (copy !== null)
            return copy;
        copy = new obj.constructor();
        const propNames = Object.keys(obj);
        propNames.forEach((p) => {
            let skipTag = skip(obj[p], p);
            if (skipTag)
                return;
            let newProp = (handler || clone)(obj[p], p, obj);
            if (isObject(newProp) && newProp !== obj[p]) {
                newProp = cloneDeepWith(newProp, handler);
            }
            try {
                // maybe unwritable
                ;
                copy[p] = newProp;
            }
            catch (e) { }
        });
        return copy;
    }

    function cloneDeep(obj) {
        return cloneDeepWith(obj, clone);
    }

    /**
     * 将一个或多个源对象的可枚举属性值分配到目标对象中属性值为undefined的属性上。
     * 如果源对象有多个，则按照从左到右的顺序依次对target赋值，相同属性会被忽略
     *
     * > 该函数会修改目标对象
     *
     * - 当目标对象是null/undefined时，返回空对象
     * - 当目标对象是基本类型时，返回对应的包装对象
     * - 当目标对象是不可扩展/冻结/封闭状态时，返回目标对象
     *
     * @example
     * //{a: 1, b: 2, c: 3}
     * console.log(_.defaults({a:1},{b:2},{c:3,b:1,a:2}))
     *
     * @param target 目标对象
     * @param sources 1-n个源对象
     * @returns 返回target
     * @since 0.21.0
     */
    function defaults(target, ...sources) {
        const rs = checkTarget(target);
        if (rs)
            return rs;
        eachSources(target, sources, null, (v, sv, tv, k, s, t) => {
            if (t[k] === undefined) {
                t[k] = v;
            }
        });
        return target;
    }

    /**
     * 与<code>defaults</code>相同，但会递归对象属性
     *
     * > 该函数会修改目标对象
     *
     * @example
     * //{a: {x: 1, y: 2, z: 3}, b: 2}
     * console.log(_.defaultsDeep({a:{x:1}},{b:2},{a:{x:3,y:2}},{a:{z:3,x:4}}))
     *
     * @param target 目标对象
     * @param sources 1-n个源对象
     * @returns 返回target
     * @since 0.21.0
     */
    function defaultsDeep(target, ...sources) {
        const rs = checkTarget(target);
        if (rs)
            return rs;
        eachSources(target, sources, null, (v, sv, tv, k, s, t) => {
            if (tv === undefined) {
                t[k] = v;
            }
            else if (isObject(tv) && !isFunction(tv)) {
                defaultsDeep(tv, sv);
            }
        });
        return target;
    }

    /**
     * 判断两个值是否相等。使用<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Same-value-zero_equality">SameValueZero</a>
     * 算法进行值比较。
     *
     * @example
     * //true
     * console.log(_.eq(NaN,NaN))
     * //false
     * console.log(_.eq(1,'1'))
     *
     * @param a
     * @param b
     * @returns
     * @since 1.0.0
     */
    function eq(a, b) {
        return eq$1(a, b);
    }

    /**
     * 对`object`内的所有属性进行断言并返回第一个匹配的属性key
     *
     * @example
     * const libs = {
     *  'func.js':{platform:['web','nodejs'],tags:{utils:true}},
     *  'juth2':{platform:['web','java'],tags:{utils:false,middleware:true}},
     *  'soya2d':{platform:['web'],tags:{utils:true}}
     * }
     *
     * //func.js 查询对象的key
     * console.log(_.findKey(libs,'tags.utils'))
     * //juth2
     * console.log(_.findKey(libs,{'tags.utils':false}))
     * //tags
     * console.log(_.findKey(libs['soya2d'],'utils'))
     * //2
     * console.log(_.findKey([{a:1,b:2},{c:2},{d:3}],'d'))
     *
     * @param object 所有集合对象array / arrayLike / map / object / ...
     * @param predicate (value[,index|key[,collection]]) 断言
     * <br>当断言是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils!iteratee}
     * @returns 第一个匹配断言的元素的key或undefined
     */
    function findKey(object, predicate) {
        const callback = iteratee(predicate);
        let rs;
        for (let k in object) {
            let v = object[k];
            const r = callback(v, k, object);
            if (r) {
                rs = k;
                break;
            }
        }
        return rs;
    }

    /**
     * <code>toPairs</code>反函数，创建一个由键值对数组组成的对象
     *
     * @example
     * //{a:1,b:2,c:3}
     * console.log(_.fromPairs([['a', 1], ['b', 2], ['c', 3]]))
     *
     * @param pairs 键值对数组
     * @returns 对象
     */
    function fromPairs(pairs) {
        const rs = {};
        for (let k in pairs) {
            let pair = pairs[k];
            rs[pair[0]] = pair[1];
        }
        return rs;
    }

    /**
     * 返回对象中的函数属性key数组
     * @example
     * const funcs = {
     *  a(){},
     *  b(){}
     * };
     * //[a,b]
     * console.log(_.functions(funcs))
     * //[....]
     * console.log(_.functions(_))
     *
     * @param obj
     * @returns 函数名数组
     * @since 0.18.0
     */
    function functions(obj) {
        let rs = [];
        let ks = Object.keys(obj);
        //通过描述信息value判断而不是直接获取obj[k]可以避免getter的直接调用
        // let descrs = Object.getOwnPropertyDescriptors<Record<string, any>>(obj)
        // let ks = Object.keys(descrs)
        for (const k of ks) {
            let descr = Object.getOwnPropertyDescriptor(obj, k);
            if (!descr)
                continue;
            // let { value } = descrs[k]
            if (isFunction(descr.value)) {
                rs.push(k);
            }
        }
        return rs;
    }

    /**
     * 检查指定key是否存在于指定的obj中（不含prototype中）
     *
     * @example
     * //true
     * console.log(_.has({a:12},'a'))
     *
     * @param obj
     * @param key
     * @returns 如果key存在返回true
     */
    function has(obj, key) {
        return obj && obj.hasOwnProperty && obj.hasOwnProperty(key);
    }

    function keysIn(obj) {
        if (isMap(obj)) {
            return Array.from(obj.keys());
        }
        const rs = [];
        // eslint-disable-next-line guard-for-in
        for (const k in obj) {
            if (k)
                rs.push(k);
        }
        return rs;
    }

    function noop() {
        return undefined;
    }

    /**
     * 与<code>merge</code>相同，但支持自定义处理器
     *
     * > 该函数会修改目标对象
     *
     * @example
     * //{x: 2, y: {a: 2, b: 4, c: 3, d: 27}}
     * console.log(_.mergeWith({x:1,y:{a:1,b:2,c:3}},{x:2,y:{a:2,d:3}},{y:{b:4}},(sv,tv,k)=>k=='d'?sv*9:undefined))
     *
     * @param target 目标对象
     * @param sources (...src[,handler(src[k],target[k],k,src,target,chain)])
     * src - 1-n个源对象;
     * handler - 自定义赋值处理器，返回赋予target[k]的值。默认使用<code>noop</code>
     * @returns 返回target
     * @since 0.22.0
     */
    function mergeWith(target, ...sources) {
        const rs = checkTarget(target);
        if (rs)
            return rs;
        let src = sources;
        const sl = src.length;
        let handler = src[sl - 1];
        if (!isFunction(handler)) {
            handler = noop;
        }
        else {
            src = src.slice(0, sl - 1);
        }
        walkSources(target, src, handler, []);
        return target;
    }
    function walkSources(target, src, handler, stack) {
        eachSources(target, src, null, (v, sv, tv, k, s, t) => {
            const path = concat(stack, k);
            v = handler(sv, tv, k, s, t, path);
            if (v !== undefined) {
                t[k] = v;
            }
            else {
                if (isObject(tv) && !isFunction(tv)) {
                    walkSources(tv, [sv], handler, path);
                }
                else {
                    t[k] = sv;
                }
            }
        });
    }

    /**
     * 类似<code>assign</code>，但会递归源对象的属性合并到目标对象。
     * <br>如果目标对象属性值存在，但对应源对象的属性值为undefined，跳过合并操作。
     * 支持自定义处理器，如果处理器返回值为undefined，启用默认合并。
     * 该函数在对可选配置项与默认配置项进行合并时非常有用
     *
     * > 该函数会修改目标对象
     *
     * - 当目标对象是null/undefined时，返回空对象
     * - 当目标对象是基本类型时，返回对应的包装对象
     * - 当目标对象是不可扩展/冻结/封闭状态时，返回目标对象
     *
     * @example
     * //{x: 0, y: {a: 1, b: 2, c: 3, d: 4}}
     * console.log(_.merge({x:1,y:{a:1,b:2}},{x:2,y:{c:5,d:4}},{x:0,y:{c:3}}))
     * //[{x: 0, y: {a: 1, b: 2, c: 3, d: 4}}]
     * console.log(_.merge([{x:1,y:{a:1,b:2}}],[{x:2,y:{c:5,d:4}}],[{x:0,y:{c:3}}]))
     *
     * @param target 目标对象
     * @param sources 1-n个源对象
     * @returns 返回target
     * @since 0.22.0
     */
    function merge(target, ...sources) {
        return mergeWith(target, ...sources, noop);
    }

    /**
     * 同<code>omit</code>，但支持断言函数进行剔除
     * @example
     * //{c: '3'}
     * console.log(_.omitBy({a:1,b:2,c:'3'},_.isNumber))
     *
     * @param obj 选取对象
     * @param [predicate=identity] (v,k)断言函数
     * @returns 对象子集
     * @since 0.23.0
     */
    function omitBy(obj, predicate) {
        const rs = {};
        if (obj === null || obj === undefined)
            return rs;
        Object.keys(obj).forEach(k => {
            let v = obj[k];
            if (!(predicate || identity)(v, k)) {
                rs[k] = v;
            }
        });
        return rs;
    }

    /**
     * 创建一个剔除指定属性的对象子集并返回。与pick()刚好相反
     * @example
     * //{a: 1, c: '3'}
     * console.log(_.omit({a:1,b:2,c:'3'},'b'))
     * //{a: 1}
     * console.log(_.omit({a:1,b:2,c:'3'},'b','c'))
     * //{c: '3'}
     * console.log(_.omit({a:1,b:2,c:'3'},['b','a']))
     *
     * @param obj 选取对象
     * @param props 属性集合
     * @returns 对象子集
     * @since 0.16.0
     */
    function omit(obj, ...props) {
        const keys = flatDeep(props);
        return omitBy(obj, (v, k) => {
            return keys.includes(k);
        });
    }

    /**
     * 解析标准/非标准JSON字符串
     * 如果str非字符串类型，返回原值
     * 如果str是无效JSON字符串，返回原值
     *
     * @example
     * //{a:1,b:2,c:'3'}
     * console.log(_.parseJSON("{a:1,b:2,c:'3'}"))
     * //{a:1,b:2,c:'3"'}
     * console.log(_.parseJSON(`[{"a":1,"b":2,"c":"3\\""}]`))
     * //true
     * console.log(_.parseJSON('true')
     * //12
     * console.log(_.parseJSON('12')
     *
     *
     * @param str JSON字符串
     * @param ignore 如果为true，当值为 NaN/Infinity 时忽略该属性，否则返回值对应字符串。默认false
     * @returns 解析后的对象或空对象
     * @since 1.9.0
     */
    function parseJSON(str, ignore = false) {
        if (!isString(str))
            return str;
        let s = (str + '').replace(/:\s*(['`])(.*)\1(?=\s*[},])/mg, ':"$2"').replace(/([{,])\s*([a-zA-Z0-9_$]+)\s*:/mg, '$1"$2":');
        s = ignore ? s.replace(/[{,]\s*"[a-zA-Z0-9_$]+"\s*:\s*([-+]?NaN|[-+]?Infinity)\s*/mg, '') : s.replace(/:\s*([-+]?NaN|[-+]?Infinity)\s*([,}])/mg, ':"$1"$2');
        let rs;
        try {
            rs = JSON.parse(s);
        }
        catch (e) {
            rs = str;
        }
        return rs;
    }

    /**
     * 同<code>pick</code>，但支持断言函数进行选取
     * @example
     * //{a: 1, b: 2}
     * console.log(_.pickBy({a:1,b:2,c:'3'},_.isNumber))
     *
     * @param obj 选取对象
     * @param [predicate=identity] (v,k)断言函数
     * @returns 对象子集
     * @since 0.23.0
     */
    function pickBy(obj, predicate) {
        const rs = {};
        if (obj === null || obj === undefined)
            return rs;
        Object.keys(obj).forEach(k => {
            let v = obj[k];
            if ((predicate || identity)(v, k)) {
                rs[k] = v;
            }
        });
        return rs;
    }

    /**
     * 创建一个指定属性的对象子集并返回
     * @example
     * //{b: 2}
     * console.log(_.pick({a:1,b:2,c:'3'},'b'))
     * //{b: 2,c:'3'}
     * console.log(_.pick({a:1,b:2,c:'3'},'b','c'))
     * //{a: 1, b: 2}
     * console.log(_.pick({a:1,b:2,c:'3'},['b','a']))
     *
     * @param obj 选取对象
     * @param props 属性集合
     * @returns 对象子集
     * @since 0.16.0
     */
    function pick(obj, ...props) {
        const keys = flatDeep(props);
        return pickBy(obj, (v, k) => {
            return includes(keys, k);
        });
    }

    /**
     * 解析传递参数并返回一个根据参数值创建的Object实例。
     * 支持数组对、k/v对、对象、混合方式等创建
     * 是 toPairs 的反函数
     *
     * @example
     * //{a:1,b:2}
     * console.log(_.toObject('a',1,'b',2))
     * //如果参数没有成对匹配，最后一个属性值则为undefined
     * //{a:1,b:2,c:undefined}
     * console.log(_.toObject('a',1,'b',2,'c'))
     * //{a:1,b:4,c:3} 重复属性会覆盖
     * console.log(_.toObject(['a',1,'b',2],['c',3],['b',4]))
     * //{a:1,b:2} 对象类型返回clone
     * console.log(_.toObject({a:1,b:2}))
     * //{1:now time,a:{}} 混合方式
     * console.log(_.toObject([1,new Date],'a',{}))
     *
     * @param vals 对象创建参数，可以是一个数组/对象或者多个成对匹配的基本类型或者多个不定的数组/对象
     * @returns 如果没有参数返回空对象
     */
    function toObject(...vals) {
        if (vals.length === 0)
            return {};
        const rs = {};
        const pairs = []; // 存放k/v
        let key = null;
        vals.forEach((v) => {
            if (isArray(v)) {
                const tmp = toObject(...v);
                assign(rs, tmp);
            }
            else if (isMap(v)) {
                v.forEach((val, k) => {
                    rs[k] = val;
                });
            }
            else if (isObject(v)) {
                if (key) {
                    pairs.push(key, v);
                    key = null;
                }
                else {
                    assign(rs, v);
                }
            }
            else {
                if (key) {
                    pairs.push(key, v);
                    key = null;
                }
                else {
                    key = v;
                }
            }
        });
        if (key) {
            pairs.push(key);
        }
        if (pairs.length > 0) {
            for (let i = 0; i < pairs.length; i += 2) {
                rs[pairs[i]] = pairs[i + 1];
            }
        }
        return rs;
    }

    /**
     * 返回指定对象的所有[key,value]组成的二维数组
     *
     * @example
     * //[['a', 1], ['b', 2], ['c', 3]]
     * console.log(_.toPairs({a:1,b:2,c:3}))
     *
     * @param obj
     * @returns 二维数组
     */
    function toPairs(obj) {
        const rs = [];
        for (let k in obj) {
            let v = obj[k];
            rs.push([k, v]);
        }
        return rs;
    }

    /**
     * 删除obj上path路径对应属性
     * @param obj 需要设置属性值的对象，如果obj不是对象(isObject返回false)，直接返回obj
     * @param path 属性路径，可以是索引数字，字符串key，或者多级属性数组
     * @since 1.0.0
     * @returns 成功返回true，失败或路径不存在返回false
     */
    function unset(obj, path) {
        if (!isObject(obj))
            return obj;
        const chain = toPath$1(path);
        let target = obj;
        for (let i = 0; i < chain.length; i++) {
            const seg = chain[i];
            const nextSeg = chain[i + 1];
            let tmp = target[seg];
            if (nextSeg) {
                tmp = target[seg] = !tmp ? (isNaN(parseInt(nextSeg)) ? {} : []) : tmp;
            }
            else {
                return delete target[seg];
            }
            target = tmp;
        }
        return false;
    }

    /**
     * 返回对象/Map的所有value数组
     * 包括原型链中的属性
     *
     * @example
     * let f = new Function("this.a=1;this.b=2;");
     * f.prototype.c = 3;
     * //[1,2,3]
     * console.log(_.valuesIn(new f()))
     *
     * @param obj
     * @returns 值列表
     */
    function valuesIn(obj) {
        if (isMap(obj)) {
            return Array.from(obj.values());
        }
        return keysIn(obj).map((k) => obj[k]);
    }

    var object = /*#__PURE__*/Object.freeze({
        __proto__: null,
        assign: assign,
        assignWith: assignWith,
        clone: clone,
        cloneDeep: cloneDeep,
        cloneDeepWith: cloneDeepWith,
        cloneWith: cloneWith,
        defaults: defaults,
        defaultsDeep: defaultsDeep,
        eq: eq,
        findKey: findKey,
        fromPairs: fromPairs,
        functions: functions,
        get: get,
        has: has,
        keys: keys,
        keysIn: keysIn,
        merge: merge,
        mergeWith: mergeWith,
        omit: omit,
        omitBy: omitBy,
        parseJSON: parseJSON,
        pick: pick,
        pickBy: pickBy,
        prop: prop$1,
        set: set,
        toObject: toObject,
        toPairs: toPairs,
        unset: unset,
        values: values,
        valuesIn: valuesIn
    });

    /**
     * 转换字符串第一个字符为小写并返回
     *
     * @example
     * //'fIRST'
     * console.log(_.lowerFirst('FIRST'))//mixCase
     * //'love loves to love Love'
     * console.log(_.lowerFirst('Love loves to love Love'))//spaces
     *
     * @param str
     * @returns 返回新字符串
     */
    function lowerFirst(str) {
        str = toString(str);
        if (str.length < 1)
            return str;
        return str[0].toLowerCase() + str.substring(1);
    }

    /**
     * 返回帕斯卡风格的字符串
     *
     * @example
     * //'LoveLovesToLoveLove'
     * console.log(_.pascalCase('Love loves to love Love'))//spaces
     * //'ABC'
     * console.log(_.pascalCase('a B-c'))//mixCase
     * //'GetMyUrl'
     * console.log(_.pascalCase('getMyURL'))//camelCase
     * //'AbCdEf'
     * console.log(_.pascalCase('AB_CD_EF'))//snakeCase
     * //'ABcDEfGhXy'
     * console.log(_.pascalCase('aBc   D__EF_GH----XY_'))//mixCase
     *
     * @param str
     * @returns 返回新字符串
     */
    function pascalCase(str) {
        let rs = "";
        str = toString(str);
        let prevType = 0; //1小写字母；2大写字母；3分隔符
        for (let i = 0; i < str.length; i++) {
            let s = str[i];
            if (isLowerCaseChar(s)) {
                if (prevType === 3 || prevType === 0) {
                    s = s.toUpperCase();
                }
                rs += s;
                prevType = 1;
                continue;
            }
            if (s === " " || s === "-" || s === "_") {
                if (prevType === 3)
                    continue;
                prevType = 3;
                continue;
            }
            if (isUpperCaseChar(s)) {
                if (prevType === 2) {
                    s = s.toLowerCase();
                }
                rs += s;
                prevType = 2;
            }
        }
        return rs;
    }

    /**
     * 返回驼峰风格的字符串
     *
     * @example
     * //'aBC'
     * console.log(_.camelCase('a-b c'))//mixCase
     * //'loveLovesToLoveLove'
     * console.log(_.camelCase('Love loves to love Love'))//spaces
     * //'aBC'
     * console.log(_.camelCase('a B-c'))//camelCase
     * //'getMyUrl'
     * console.log(_.camelCase('getMyURL'))//camelCase
     *
     * @param str
     * @returns 返回新字符串
     */
    function camelCase(str) {
        return lowerFirst(pascalCase(toString(str)));
    }

    /**
     * 把字符串的首字母大写，如果首字母不是ascii中的a-z则返回原值
     *
     * @example
     * //Abc
     * console.log(_.capitalize('abc'))
     * //''
     * console.log(_.capitalize(null))
     * //1
     * console.log(_.capitalize(1))
     *
     *
     * @param str 字符串
     * @returns 对于null/undefined会返回空字符串
     */
    function capitalize(str) {
        str = toString(str);
        if (str.length < 1)
            return str;
        return str[0].toUpperCase() + toString(str.substring(1)).toLowerCase();
    }

    /**
     * 验证字符串是否以查询子字符串结尾
     *
     * @example
     * //true
     * console.log(_.endsWith('func.js','js'))
     * //true
     * console.log(_.endsWith('func.js','c',4))
     *
     * @param str
     * @param searchStr 查询字符串
     * @param position 索引
     * @returns 如果以查询子字符串开头返回true，否则返回false
     */
    function endsWith(str, searchStr, position) {
        return toString(str).endsWith(searchStr, position);
    }

    /**
     * 转义正则字符串中的特殊字符，包括 '\', '$', '(', ')', '*', '+', '.', '[', ']', '?', '^', '\{', '\}', '|'
     *
     * @example
     * //\^\[func\.js\] \+ \{crud-vue\} = \.\*\?\$
     * console.log(_.escapeRegExp('^[func.js] + {crud-vue} = .*?$'))
     *
     * @param str 需要转义的字符串
     * @returns 转义后的新字符串
     * @since 1.0.0
     */
    function escapeRegExp(str) {
        let rs = "";
        str = toString(str);
        for (let i = 0; i < str.length; i++) {
            let s = str[i];
            const code = s.charCodeAt(0);
            if (code === 36 ||
                code === 46 ||
                code === 63 ||
                (code >= 40 && code <= 43) ||
                (code >= 91 && code <= 94) ||
                (code >= 123 && code <= 125)) {
                s = "\\" + s;
            }
            rs += s;
        }
        return rs;
    }

    /**
     * 查找指定值在字符串中首次出现的位置索引
     *
     * @example
     * //10
     * console.log(_.indexOf('cyberfunc.js','js'))
     * //10
     * console.log(_.indexOf('cyberfunc.js','js',5))
     *
     * @param str
     * @param search 指定字符串
     * @param [fromIndex=0] 起始索引
     * @returns 第一个匹配搜索字符串的位置索引或-1
     */
    function indexOf(str, search, fromIndex) {
        str = toString(str);
        return str.indexOf(search, fromIndex || 0);
    }

    /**
     * 返回短横线风格的字符串
     *
     * @example
     * //'a-b-c'
     * console.log(_.kebabCase('a_b_c'))//snakeCase
     * //'webkit-perspective-origin-x'
     * console.log(_.kebabCase('webkitPerspectiveOriginX'))//camelCase
     * //'a-b-c'
     * console.log(_.kebabCase('a B-c'))//mixCase
     * //'get-my-url'
     * console.log(_.kebabCase('getMyURL'))//camelCase
     *
     * @param str
     * @returns 返回新字符串
     */
    function kebabCase(str) {
        let rs = "";
        str = toString(str);
        let prevType = 0; //1小写字母；2大写字母；3分隔符
        let lastPos = str.length - 1;
        for (let i = 0; i < str.length; i++) {
            const s = str[i];
            if (isLowerCaseChar(s)) {
                rs += s;
                prevType = 1;
                continue;
            }
            if (s === " " || s === "-" || s === "_") {
                if (prevType === 3 || i === lastPos)
                    continue;
                rs += "-";
                prevType = 3;
                continue;
            }
            if (isUpperCaseChar(s)) {
                if (prevType === 1) {
                    rs += "-";
                }
                rs += s.toLowerCase();
                prevType = 2;
            }
        }
        return rs;
    }

    /**
     * 查找指定值在字符串中最后出现的位置索引
     *
     * @example
     * //10
     * console.log(_.lastIndexOf('cyberfunc.js','js'))
     * //-1
     * console.log(_.lastIndexOf('cyberfunc.js','js',5))
     *
     * @param str
     * @param search 指定字符串
     * @param [fromIndex=Infinity] 起始索引，从起始索引位置向左查找指定字符串
     * @returns 最后一个匹配搜索字符串的位置索引或-1
     */
    function lastIndexOf(str, search, fromIndex) {
        str = toString(str);
        return str.lastIndexOf(search, fromIndex || Infinity);
    }

    /**
     * 返回所有字母是小写格式的字符串
     *
     * @example
     * //''
     * console.log(_.lowerCase())
     * //'func.js'
     * console.log(_.lowerCase('FUNC.JS'))
     *
     * @param str
     * @returns 返回新字符串
     */
    function lowerCase(str) {
        return toString(str).toLowerCase();
    }

    /**
     * 使用填充字符串填充原字符串达到指定长度。从原字符串起始开始填充。
     *
     * @example
     * //001
     * console.log(_.padStart('1',3,'0'))
     *
     * @param str 原字符串。如果非字符串则会自动转换成字符串
     * @param len 填充后的字符串长度，如果长度小于原字符串长度，返回原字符串
     * @param [padString=' '] 填充字符串，如果填充后超出指定长度，会自动截取并保留右侧字符串
     * @returns 在原字符串起始填充至指定长度后的字符串
     */
    function padStart(str, len, padString) {
        str = toString(str);
        if (str.padStart)
            return str.padStart(len, padString);
        padString = padString || ' ';
        const diff = len - str.length;
        if (diff < 1)
            return str;
        let fill = '';
        let i = Math.ceil(diff / padString.length);
        while (i--) {
            fill += padString;
        }
        return fill.substring(fill.length - diff, fill.length) + str;
    }

    /**
     * 使用字符0填充原字符串达到指定长度。从原字符串起始位置开始填充。
     *
     * @example
     * //001
     * console.log(_.padZ('1',3))
     *
     * @param str 原字符串
     * @param len 填充后的字符串长度
     * @returns 填充后的字符串
     */
    function padZ(str, len) {
        return padStart(str, len, '0');
    }

    /**
     * 创建一个以原字符串为模板，重复指定次数的新字符串
     *
     * @example
     * //funcfuncfunc
     * console.log(_.repeat('func',3))
     *
     * @param str 原字符串
     * @param count 重复次数
     * @returns 对于null/undefined会返回空字符串
     */
    function repeat(str, count) {
        str = toString(str);
        count = Number.isFinite(count) ? count : 0;
        if (count < 1)
            return '';
        if (str.repeat)
            return str.repeat(count);
        let i = count;
        let rs = '';
        while (i--) {
            rs += str;
        }
        return rs;
    }

    /**
     * 使用<code>replaceValue</code>替换<code>str</code>中的首个<code>searchValue</code>部分
     *
     * @example
     * //'func-js'
     * console.log(_.replace('func.js','.','-'))
     * //''
     * console.log(_.replace(null,'.','-'))
     * //'kelikeli'
     * console.log(_.replace('geligeli',/ge/g,'ke'))
     * //'geligeli'
     * console.log(_.replace('kelikeli',/ke/g,()=>'ge'))
     *
     * @param str 字符串。非字符串值会自动转换成字符串
     * @param searchValue 查找内容，正则或者字符串
     * @param replaceValue 替换内容，字符串或处理函数。函数的返回值将用于替换
     * @returns 替换后的新字符串
     */
    function replace(str, searchValue, replaceValue) {
        return toString(str).replace(searchValue, replaceValue);
    }

    function replaceAll(str, searchValue, replaceValue) {
        let searchExp;
        let strRs = toString(str);
        if (isRegExp(searchValue)) {
            searchExp = searchValue;
            if (!searchValue.global) {
                searchExp = new RegExp(searchValue, searchValue.flags + 'g');
            }
            return strRs.replace(searchExp, replaceValue);
        }
        else if (isString(searchValue)) {
            searchExp = new RegExp(escapeRegExp(searchValue), 'g');
            return strRs.replace(searchExp, replaceValue);
        }
        else if (isObject(searchValue)) {
            const ks = Object.keys(searchValue);
            for (let i = ks.length; i--;) {
                const k = ks[i];
                const v = searchValue[k];
                searchExp = new RegExp(escapeRegExp(k), 'g');
                strRs = strRs.replace(searchExp, v);
            }
            return strRs;
        }
        return str;
    }

    /**
     * 返回下划线风格的字符串
     *
     * @example
     * //'a_b_c'
     * console.log(_.snakeCase('a-b c'))//mixCase
     * //'love_loves_to_love_love'
     * console.log(_.snakeCase('Love loves to love Love'))//spaces
     * //'a_b_c'
     * console.log(_.snakeCase('a B-c'))//camelCase
     * //'get_my_url'
     * console.log(_.snakeCase('getMyURL'))//camelCase
     *
     * @param str
     * @returns 返回新字符串
     */
    function snakeCase(str) {
        let rs = "";
        str = toString(str);
        let prevType = 0; //1小写字母；2大写字母；3分隔符
        let lastPos = str.length - 1;
        for (let i = 0; i < str.length; i++) {
            const s = str[i];
            if (isLowerCaseChar(s)) {
                rs += s;
                prevType = 1;
                continue;
            }
            if (s === " " || s === "-" || s === "_") {
                if (prevType === 3 || i === lastPos)
                    continue;
                rs += "_";
                prevType = 3;
                continue;
            }
            if (isUpperCaseChar(s)) {
                if (prevType === 1) {
                    rs += "_";
                }
                rs += s.toLowerCase();
                prevType = 2;
            }
        }
        return rs;
    }

    /**
     * 使用分隔符将字符串分割为多段数组
     *
     * @example
     * //["func", "js"]
     * console.log(_.split('func.js','.'))
     * //["func"]
     * console.log(_.split('func.js','.',1))
     *
     * @param str 原字符串。如果非字符串则会自动转换成字符串
     * @param separator 分隔符
     * @param [limit] 限制返回的结果数量，为空返回所有结果
     * @returns 分割后的数组
     */
    function split(str, separator, limit) {
        return toString(str).split(separator, limit);
    }

    /**
     * 验证字符串是否以查询子字符串开头
     *
     * @example
     * //true
     * console.log(_.startsWith('func.js','func'))
     * //false
     * console.log(_.startsWith('func.js','func',3))
     * //true
     * console.log(_.startsWith('func.js','c',3))
     *
     * @param str
     * @param searchStr 查询字符串
     * @param [position=0] 索引
     * @returns 如果以查询子字符串开头返回true，否则返回false
     */
    function startsWith(str, searchStr, position) {
        return toString(str).startsWith(searchStr, position);
    }

    /**
     * 对字符串进行截取，返回从起始索引到结束索引间的新字符串。
     *
     * @example
     * //"34567"
     * console.log(_.substring('12345678',2,7))
     * //"345678"
     * console.log(_.substring('12345678',2))
     * //""
     * console.log(_.substring())
     *
     * @param str 需要截取的字符串，如果非字符串对象会进行字符化处理。基本类型会直接转为字符值，对象类型会调用toString()方法
     * @param [indexStart=0] 起始索引，包含
     * @param [indexEnd=str.length] 结束索引，不包含
     * @returns
     */
    function substring(str, indexStart, indexEnd) {
        str = toString(str);
        indexStart = indexStart || 0;
        return str.substring(indexStart, indexEnd);
    }

    /**
     * 检测字符串是否与指定的正则匹配
     *
     * @example
     * //true 忽略大小写包含判断
     * console.log(_.test('func.js','Func','i'))
     * //true 忽略大小写相等判断
     * console.log(_.test('func.js',/^FUNC\.js$/i))
     * //false
     * console.log(_.test('func.js',/FUNC/))
     *
     * @param str
     * @param pattern 指定正则。如果非正则类型会自动转换为正则再进行匹配
     * @param [flags] 如果pattern参数不是正则类型，会使用该标记作为正则构造的第二个参数
     * @returns 匹配返回true
     * @since 0.19.0
     */
    function test(str, pattern, flags) {
        let regExp = pattern;
        if (!isRegExp(regExp)) {
            regExp = new RegExp(pattern, flags);
        }
        return regExp.test(str);
    }

    /**
     * 截取数字小数位。用来修复原生toFixed函数的bug
     *
     * @example
     * //14.05
     * console.log(_.toFixed(14.049,2))
     * //-15
     * console.log(_.toFixed(-14.6))
     * //14.0001
     * console.log(_.toFixed(14.00005,4))
     * //0.101
     * console.log(_.toFixed(0.1009,3))
     * //2.47
     * console.log(_.toFixed(2.465,2))
     * //2.46 原生
     * console.log((2.465).toFixed(2))
     *
     * @param v 数字或数字字符串
     * @param [scale=0] 小数位长度
     * @returns 截取后的字符串
     */
    function toFixed(v, scale) {
        scale = scale || 0;
        const num = parseFloat(v + '');
        if (isNaN(num))
            return v;
        let numStr = num + '';
        if (numStr.includes('e')) {
            let [coefficient, power] = numStr.split('e');
            let p = parseInt(power);
            let cn = coefficient.replace('.', '');
            numStr = p < 0 ? `0.${'0'.repeat(-p - 1)}${cn}` : `${cn}${'0'.repeat(p - cn.length + 1)}`;
        }
        const isNeg = num < 0 ? -1 : 1;
        const tmp = numStr.split('.');
        const frac = tmp[1] || '';
        const diff = scale - frac.length;
        let rs = '';
        if (diff > 0) {
            let z = padEnd(frac, scale, '0');
            z = z ? '.' + z : z;
            rs = tmp[0] + z;
        }
        else if (diff === 0) {
            rs = numStr;
        }
        else {
            let integ = parseInt(tmp[0]);
            const i = frac.length + diff;
            const round = frac.substring(i);
            let keep = frac.substring(0, i);
            let startZ = false;
            if (keep[0] === '0' && keep.length > 1) {
                keep = 1 + keep.substring(1);
                startZ = true;
            }
            let n = Math.round(parseFloat(keep + '.' + round));
            let nStr = n + '';
            const strN = n + '';
            if (n > 0 && strN.length > keep.length) {
                integ += 1 * isNeg;
                nStr = strN.substring(1);
            }
            if (startZ) {
                nStr = parseInt(strN[0]) - 1 + strN.substring(1);
            }
            nStr = nStr !== '' && keep.length > 0 ? '.' + nStr : nStr;
            rs = integ + nStr + '';
            if (isNeg < 0 && rs[0] !== '-')
                rs = '-' + rs;
        }
        return rs;
    }

    /**
     * 从字符串的两端删除空白字符。
     *
     * @example
     * //holyhigh
     * console.log(_.trim('  holyhigh '))
     *
     * @param str
     * @returns 对于null/undefined会返回空字符串
     */
    function trim(str) {
        str = toString(str);
        return str.trim();
    }

    /**
     * 从字符串末尾删除空白字符。
     *
     * @example
     * //'  holyhigh'
     * console.log(_.trimEnd('  holyhigh '))
     *
     * @param str
     * @returns 对于null/undefined会返回空字符串
     */
    function trimEnd(str) {
        str = toString(str);
        if (str.trimEnd)
            return str.trimEnd();
        return str.replace(/\s*$/, '');
    }

    /**
     * 从字符串起始位置删除空白字符。
     *
     * @example
     * //'holyhigh '
     * console.log(_.trimStart('  holyhigh '))
     *
     * @param str
     * @returns 对于null/undefined会返回空字符串
     */
    function trimStart(str) {
        str = toString(str);
        if (str.trimStart)
            return str.trimStart();
        return str.replace(/^\s*/, '');
    }

    /**
     * 对超过指定长度的字符串进行截取并在末尾追加代替字符
     *
     * @example
     * //func...
     * console.log(_.truncate('func.js',4))
     * //func...
     * console.log(_.truncate('func.js',6,{separator:/\.\w+/g}))
     * //func.js.com...
     * console.log(_.truncate('func.js.com.cn',13,{separator:'.'}))
     * //func.js
     * console.log(_.truncate('func.js',10))
     * //fun!!!
     * console.log(_.truncate('func.js',3,{omission:'!!!'}))
     *
     * @param str
     * @param len 最大长度。如果长度大于<code>str</code>长度，直接返回str
     * @param {object} options 可选项
     * @param options.omission 替代字符，默认 '...'
     * @param [options.separator] 截断符。如果截取后的字符串中包含截断符，则最终只会返回截断符之前的内容
     * @returns 返回新字符串
     * @since 1.0.0
     */
    function truncate(str, len, options) {
        str = toString(str);
        if (str.length <= len)
            return str;
        if (!isObject(options)) {
            options = { omission: '...' };
        }
        options.omission = options.omission || '...';
        str = str.substring(0, len);
        if (options.separator) {
            let separator = options.separator;
            if (!isObject(separator)) {
                separator = new RegExp(escapeRegExp(separator), 'g');
            }
            else if (!separator.global) {
                separator = new RegExp(separator, separator.flags + 'g');
            }
            let rs;
            let tmp;
            while ((tmp = separator.exec(str)) !== null) {
                rs = tmp;
            }
            if (rs) {
                str = str.substring(0, rs.index);
            }
        }
        return str + options.omission;
    }

    /**
     * 返回所有字母是大写格式的字符串
     *
     * @example
     * //''
     * console.log(_.upperCase())
     * //'FUNC.JS'
     * console.log(_.upperCase('func.js'))
     *
     * @param str
     * @returns 返回新字符串
     */
    function upperCase(str) {
        return toString(str).toUpperCase();
    }

    /**
     * 转换字符串第一个字符为大写并返回
     *
     * @example
     * //'First'
     * console.log(_.upperFirst('first'))//mixCase
     * //'GetMyURL'
     * console.log(_.upperFirst('getMyURL'))//camelCase
     *
     * @param str
     * @returns 返回新字符串
     */
    function upperFirst(str) {
        str = toString(str);
        if (str.length < 1)
            return str;
        return str[0].toUpperCase() + str.substring(1);
    }

    var str = /*#__PURE__*/Object.freeze({
        __proto__: null,
        camelCase: camelCase,
        capitalize: capitalize,
        endsWith: endsWith,
        escapeRegExp: escapeRegExp,
        indexOf: indexOf,
        kebabCase: kebabCase,
        lastIndexOf: lastIndexOf,
        lowerCase: lowerCase,
        lowerFirst: lowerFirst,
        padEnd: padEnd,
        padStart: padStart,
        padZ: padZ,
        pascalCase: pascalCase,
        repeat: repeat,
        replace: replace,
        replaceAll: replaceAll,
        snakeCase: snakeCase,
        split: split,
        startsWith: startsWith,
        substring: substring,
        test: test,
        toFixed: toFixed,
        toString: toString,
        trim: trim,
        trimEnd: trimEnd,
        trimStart: trimStart,
        truncate: truncate,
        upperCase: upperCase,
        upperFirst: upperFirst
    });

    /* eslint-disable max-len */
    /**
     * 模板函数
     *
     * @packageDocumentation
     */
    /**
     *
     * @author holyhigh
     */
    /**
     * 使用MTL(Myfx Template Language)编译字符串模板，并返回编译后的render函数
     *
     * ### 一个MTL模板由如下部分组成：
     * - **文本** 原样内容输出
     * - **注释** `[%-- 注释 --%]` 仅在模板中显示，编译后不存在也不会输出
     * - **插值** `[%= 插值内容 %]` 输出表达式的结果，支持js语法
     * - **混入** `[%@名称 {参数} %]` 可以混入模板片段。被混入的片段具有独立作用域，可以通过JSON格式的对象传递参数给片段
     * - **语句** `[% _.each(xxxx... %]` 原生js语句
     *
     * @example
     * let render = _.template("1 [%= a %] 3");
     * //1 4 3
     * console.log(render({a:4}))
     *
     * render = _.template("1 [% print(_.range(2,5)) %] 5");
     * //1 2,3,4 5
     * console.log(render())
     *
     * render = _.template("[%-- 注释1 --%] [%@mix {x:5}%] [%-- 注释2 --%]",{
     *  mixins:{
     *    mix:'<div>[%= x %]</div>'
     *  }
     * });
     * //<div>5</div>
     * console.log(render())
     *
     * @param string 模板字符串
     * @param {object} options MTL参数
     * @param options.delimiters 分隔符，默认 ['[%' , '%]']
     * @param options.mixins 混入对象。\{名称:模板字符串\}
     * @param options.globals 全局变量对象，可以在任意位置引用。模板内置的全局对象有两个：`print(content)`函数、`_` 对象，Myfx的命名空间
     * @param options.stripWhite 是否剔除空白，默认false。剔除发生在编译期间，渲染时不会受到影响。剔除规则：如果一行只有一个MTL注释或语句，则该行所占空白会被移除。
     * @returns 编译后的执行函数。该函数需要传递一个对象类型的参数作为运行时参数
     * @since 1.0.0
     */
    function template$1(string, options) {
        let delimiters = map(options?.delimiters || template$1.settings.delimiters, (d) => {
            const letters = replace(d, /\//gim, "");
            return map(letters, (l) => {
                return includes(ESCAPES, l) ? "\\" + l : l;
            }).join("");
        });
        if (!options) {
            options = {
                delimiters: delimiters,
                globals: {},
                mixins: undefined,
                stripWhite: false
            };
        }
        const mixins = options.mixins;
        const stripWhite = options.stripWhite || false;
        const comment = delimiters[0] + template$1.settings.comment + delimiters[1];
        const interpolate = delimiters[0] + template$1.settings.interpolate + delimiters[1];
        const evaluate = delimiters[0] + template$1.settings.evaluate + delimiters[1];
        const mixin = delimiters[0] + template$1.settings.mixin + delimiters[1];
        const splitExp = new RegExp(`(?:${comment})|(?:${mixin})|(?:${interpolate})|(?:${evaluate})`, "mg");
        // ///////////////////////////////----拆分表达式与文本
        // 1. 对指令及插值进行分段
        const tokens = parse(string, splitExp, mixins, stripWhite, delimiters);
        // 2. 编译render函数
        const render = compile(tokens, options);
        return render;
    }
    const ESCAPES = ["[", "]", "{", "}", "$"];
    /**
     * 模板设置对象
     */
    template$1.settings = {
        /**
         * @defaultValue ['[%', '%]']
         */
        delimiters: ["[%", "%]"],
        interpolate: "=([\\s\\S]+?)",
        comment: "--[\\s\\S]+?--",
        mixin: "@([a-zA-Z_$][\\w_$]*)([\\s\\S]+?)",
        evaluate: "([\\s\\S]+?)",
    };
    function parse(str, splitExp, mixins, stripWhite, delimiters) {
        let indicator = 0;
        let lastSegLength = 0;
        const fullStack = [];
        let prevText = null;
        while (true) {
            const rs = splitExp.exec(str);
            if (rs == null) {
                break;
            }
            else {
                let text = str.substring(indicator + lastSegLength, rs.index);
                if (prevText) {
                    // check strip white
                    if (stripWhite) {
                        const stripStart = prevText.replace(/\n\s*$/, "\n");
                        const stripEnd = text.replace(/^\s*\n/, "");
                        if (stripStart.length !== prevText.length &&
                            stripEnd.length !== text.length) {
                            text = stripEnd;
                        }
                    }
                }
                prevText = text;
                indicator = rs.index;
                if (text) {
                    const node = getText(text);
                    fullStack.push(node);
                }
                try {
                    const node2 = parseNode(rs, mixins, delimiters);
                    fullStack.push(node2);
                }
                catch (error) {
                    // 获取最近信息
                    const recInfo = takeRight(fullStack, 5);
                    const tipInfo = map(recInfo, "source").join("") + rs[0];
                    let tipIndicator = map(rs[0], () => "^").join("");
                    const tipLineStartIndex = lastIndexOf(substring(str, 0, rs.index), "\n") + 1;
                    tipIndicator = padStart(tipIndicator, rs.index - tipLineStartIndex + tipIndicator.length, " ");
                    console.error("...", tipInfo + "\n" + tipIndicator + "\n", error);
                    return fullStack;
                }
                lastSegLength = rs[0].length;
            }
        }
        let lastText = trim(str.substring(indicator + lastSegLength));
        if (lastText) {
            const node = getText(lastText);
            fullStack.push(node);
        }
        return fullStack;
    }
    function getText(str) {
        return {
            text: true,
            source: str,
        };
    }
    function parseNode(rs, mixins, delimiters) {
        const parts = compact(rs);
        const src = parts[0];
        const modifier = src.replace(new RegExp(delimiters[0]), "")[0];
        switch (modifier) {
            case "-":
                return {
                    comment: true,
                    source: src,
                };
            case "=":
                return {
                    interpolate: true,
                    source: src,
                    expression: parts[1],
                };
            case "@":
                const mixin = parts[1];
                if (!mixins || !mixins[mixin]) {
                    throw new SyntaxError(`The mixin '${mixin}' does not exist, check if the options.mixins has been set`);
                }
                let paramters = trim(parts[2]);
                if (paramters) {
                    const matcher = paramters.match(/\{(?:,?[a-zA-Z_$][a-zA-Z0-9_$]*(?::.*?)?)+\}/gm);
                    if (!matcher) {
                        throw new SyntaxError(`Invalid mixin paramters '${parts[2]}', must be JSON form`);
                    }
                    paramters = matcher[0];
                }
                return {
                    mixin: true,
                    source: src,
                    tmpl: mixins[mixin],
                    paramters,
                };
            default:
                return {
                    evaluate: true,
                    source: src,
                    expression: parts[1],
                };
        }
    }
    // 返回编译后的render函数
    // 函数中不能出现异步代码，否则会导致render失败
    // 默认全局变量 print() / _
    function compile(tokens, options) {
        let funcStr = "";
        each(tokens, (token) => {
            if (token.comment)
                return;
            if (token.text) {
                funcStr += "\nprint(`" + token.source + "`);";
            }
            else if (token.interpolate) {
                funcStr += `\nprint(${token.expression});`;
            }
            else if (token.evaluate) {
                funcStr += "\n" + token.expression;
            }
            else if (token.mixin) {
                funcStr += `\nprint(_.template(${JSON.stringify(token.tmpl)},$options)(${token.paramters}));`;
            }
        });
        return (obj) => {
            let declarations = keys(obj).join(",");
            if (declarations) {
                declarations = "{" + declarations + "}";
            }
            let globalKeys = [];
            let globalValues = [];
            const paramAry = unzip(toPairs(options.globals));
            if (size(paramAry) > 0) {
                globalKeys = paramAry[0];
                globalValues = paramAry[1];
            }
            if (!globalKeys.includes("_") && globalThis.myfx) {
                globalKeys.push("_");
                globalValues.push(globalThis.myfx);
            }
            const getRender = new Function(...globalKeys, "$options", `return function(${declarations}){
      const textQ=[];
      const print=(str)=>{
        textQ.push(str)
      };` +
                funcStr +
                ';return textQ.join("")}')(...globalValues, options);
            return getRender(obj);
        };
    }

    var template = /*#__PURE__*/Object.freeze({
        __proto__: null,
        template: template$1
    });

    /**
     * 使用高性能算法，将array结构数据变为tree结构数据。*注意，会修改原始数据*
     * @example
     * //生成测试数据
     * function addChildren(count,parent){
     *  const data = [];
     *  const pid = parent?parent.id:null;
     *  const parentName = parent?parent.name+'-':'';
     *  _.each(_.range(0,count),i=>{
     *    const sortNo = _.randi(0,count);
     *    data.push({id:_.alphaId(),pid,name:parentName+i,sortNo})
     *  });
     *  return data;
     * }
     *
     * function genTree(depth,parents,data){
     *  _.each(parents,r=>{
     *    const children = addChildren(_.randi(1,4),r);
     *    if(depth-1>0){
     *      genTree(depth-1,children,data);
     *    }
     *    _.append(data,...children);
     *  });
     * }
     *
     * const roots = addChildren(2);
     * const data = [];
     * genTree(2,roots,data);
     * _.insert(data,0,...roots);
     *
     * const tree = _.arrayToTree(data,'id','pid',{attrMap:{text:'name'}});
     * _.walkTree(tree,(parentNode,node,chain)=>console.log('node',node.text,'sortNo',node.sortNo,'chain',_.map(chain,n=>n.name)));
     *
     *
     * @param array 原始数据集。如果非Array类型，返回空数组
     * @param idKey id标识
     * @param pidKey='pid' 父id标识
     * @param {object} options 自定义选项
     * @param options.rootParentValue 根节点的parentValue，用于识别根节点。默认null
     * @param options.childrenKey 包含子节点容器的key。默认'children'
     * @param options.attrMap 转换tree节点时的属性映射，如\{text:'name'\}表示把array中一条记录的name属性映射为tree节点的text属性
     * @param options.sortKey 如果指定排序字段，则会在转换tree时自动排序。字段值可以是数字或字符等可直接进行比较的类型。性能高于转换后再排序
     * @returns 返回转换好的顶级节点数组或空数组
     * @since 1.0.0
     */
    function arrayToTree(array, idKey = 'id', pidKey, options = { childrenKey: 'children', rootParentValue: null, attrMap: undefined, sortKey: '' }) {
        if (!isArray(array))
            return [];
        const pk = pidKey || 'pid';
        const attrMap = options.attrMap;
        const hasAttrMap = !!attrMap && isObject(attrMap);
        const rootParentValue = get(options, 'rootParentValue', null);
        const childrenKey = options.childrenKey || 'children';
        const sortKey = options.sortKey;
        const hasSortKey = !!sortKey;
        const roots = [];
        const nodeMap = {};
        const sortMap = {};
        const initParentMap = {};
        array.forEach((record) => {
            const nodeId = record[idKey || 'id'];
            nodeMap[nodeId] = record;
            if (hasSortKey) {
                const sortNo = record[sortKey];
                sortMap[nodeId] = [sortNo, sortNo]; // min,max
            }
            if (record[pk] === rootParentValue) {
                if (hasAttrMap) {
                    each(attrMap, (v, k) => (record[k] = record[v]));
                }
                roots.push(record);
            }
        });
        array.forEach((record) => {
            const parentId = record[pk];
            const parentNode = nodeMap[parentId];
            if (parentNode) {
                let children = parentNode[childrenKey];
                if (!initParentMap[parentId]) {
                    children = parentNode[childrenKey] = [];
                    initParentMap[parentId] = true;
                }
                if (hasAttrMap) {
                    each(attrMap, (v, k) => (record[k] = record[v]));
                }
                if (hasSortKey) {
                    const [min, max] = sortMap[parentId];
                    const sortNo = record[sortKey];
                    if (sortNo <= min) {
                        children.unshift(record);
                        sortMap[parentId][0] = sortNo;
                    }
                    else if (sortNo >= max) {
                        children.push(record);
                        sortMap[parentId][1] = sortNo;
                    }
                    else {
                        const i = sortedIndexBy(children, { [sortKey]: sortNo }, sortKey);
                        children.splice(i, 0, record);
                    }
                }
                else {
                    children.push(record);
                }
            }
        });
        return hasSortKey ? sortBy(roots, sortKey) : roots;
    }

    function closest(node, predicate, parentKey) {
        let p = node;
        let t = null;
        let k = true;
        let i = 0;
        while (k && p) {
            if (predicate(p, i++, () => { k = false; })) {
                t = p;
                break;
            }
            p = p[parentKey];
        }
        return t;
    }

    /**
     * 以给定节点为根遍历所有子孙节点。深度优先
     * @example
     * //生成测试数据
     * function addChildren(count,parent){
     *  const data = [];
     *  const pid = parent?parent.id:null;
     *  const parentName = parent?parent.name+'-':'';
     *  _.each(_.range(0,count),i=>{
     *    const sortNo = _.randi(0,count);
     *    data.push({id:_.alphaId(),pid,name:parentName+i,sortNo})
     *  });
     *  return data;
     * }
     *
     * function genTree(depth,parents,data){
     *  _.each(parents,r=>{
     *    const children = addChildren(_.randi(1,4),r);
     *    if(depth-1>0){
     *      genTree(depth-1,children,data);
     *    }
     *    _.append(data,...children);
     *  });
     * }
     *
     * const roots = addChildren(2);
     * const data = [];
     * genTree(2,roots,data);
     * _.insert(data,0,...roots);
     * const tree = _.arrayToTree(data,'id','pid',{sortKey:'sortNo'});
     *
     * _.walkTree(tree,(node,parentNode,chain)=>console.log('node',node.name,'sortNo',node.sortNo,'chain',_.map(chain,n=>n.name)))
     *
     * @param treeNodes 一组节点或一个节点
     * @param callback (node,parentNode,chain,level,index)回调函数，如果返回false则中断遍历，如果返回-1则停止分支遍历
     * @param {object} options 自定义选项
     * @param options.childrenKey 包含子节点容器的key。默认'children'
     * @since 1.0.0
     */
    function walkTree(treeNodes, callback, options) {
        _walkTree(treeNodes, callback, options);
    }
    function _walkTree(treeNodes, callback, options, ...rest) {
        if (!isObject(treeNodes))
            return;
        options = options || {};
        const parentNode = rest[0];
        const chain = rest[1] || [];
        const childrenKey = options.childrenKey || 'children';
        const data = isArrayLike(treeNodes) ? treeNodes : [treeNodes];
        for (let i = 0; i < data.length; i++) {
            const node = data[i];
            const rs = callback(node, parentNode, chain, chain.length, i);
            if (rs === false)
                return false;
            if (rs === -1)
                continue;
            if (!isEmpty(node[childrenKey])) {
                let nextChain = [node];
                if (parentNode) {
                    nextChain = chain.concat(nextChain);
                }
                const rs = _walkTree(node[childrenKey], callback, options, node, nextChain);
                if (rs === false)
                    return;
            }
        }
    }

    /**
     * 类似<code>findTreeNodes</code>，但会返回包含所有父节点的节点副本数组，已做去重处理。
     * 结果集可用于重新构建tree
     * @example
     * //生成测试数据
     * function addChildren(count,parent){
     *  const data = [];
     *  const pid = parent?parent.id:null;
     *  const parentName = parent?parent.name+'-':'';
     *  _.each(_.range(0,count),i=>{
     *    const sortNo = _.randi(1,4);
     *    data.push({id:_.alphaId(),pid,name:parentName+i,sortNo})
     *  });
     *  return data;
     * }
     *
     * function genTree(depth,parents,data){
     *  _.each(parents,r=>{
     *    const children = addChildren(_.randi(1,4),r);
     *    if(depth-1>0){
     *      genTree(depth-1,children,data);
     *    }
     *    _.append(data,...children);
     *  });
     * }
     *
     * const roots = addChildren(2);
     * const data = [];
     * genTree(2,roots,data);
     * _.insert(data,0,...roots);
     * const tree = _.arrayToTree(data,'id','pid',{sortKey:'sortNo'});
     *
     * _.each(_.filterTree(tree,node=>node.sortNo>1),node=>console.log(_.omit(node,'children','id','pid')))
     *
     *
     * @param treeNodes 一组节点或一个节点
     * @param predicate (node,parentNode,chain,level) 断言
     * <br>当断言是函数时回调参数见定义
     * <br>其他类型请参考 {@link utils!iteratee}
     * @param {object} options 自定义选项
     * @param options.childrenKey 包含子节点容器的key。默认'children'
     * @returns 找到的符合条件的所有节点副本或空数组
     * @since 1.0.0
     */
    function filterTree(treeNodes, predicate, options = { childrenKey: 'children' }) {
        const callback = iteratee(predicate);
        const childrenKey = options.childrenKey || 'children';
        let nodes = [];
        walkTree(treeNodes, (n, p, c, l) => {
            const rs = callback(n, p, c, l);
            if (rs) {
                c.forEach((node) => {
                    if (!includes(nodes, node)) {
                        nodes.push(node);
                    }
                });
                nodes.push(n);
            }
        }, options);
        nodes = map(nodes, (item) => cloneWith(item, (v, k) => (k === childrenKey ? null : v)));
        return nodes;
    }

    function findTreeNode(treeNodes, predicate, options) {
        const callback = iteratee(predicate);
        let node;
        walkTree(treeNodes, (n, p, c, l, i) => {
            const rs = callback(n, p, c, l, i);
            if (rs) {
                node = n;
                return false;
            }
        }, options);
        return node;
    }

    function findTreeNodes(treeNodes, predicate, options) {
        const callback = iteratee(predicate);
        const nodes = [];
        walkTree(treeNodes, (n, p, c, l, i) => {
            const rs = callback(n, p, c, l, i);
            if (rs) {
                nodes.push(n);
            }
        }, options);
        return nodes;
    }

    /**
     * 对给定节点及所有子孙节点(同级)排序
     * @example
     * //生成测试数据
     * function addChildren(count,parent){
     *  const data = [];
     *  const pid = parent?parent.id:null;
     *  const parentName = parent?parent.name+'-':'';
     *  _.each(_.range(0,count),i=>{
     *    const sortNo = _.randi(0,9);
     *    data.push({id:_.alphaId(),pid,name:parentName+i,sortNo})
     *  });
     *  return data;
     * }
     *
     * function genTree(depth,parents,data){
     *  _.each(parents,r=>{
     *    const children = addChildren(_.randi(1,4),r);
     *    if(depth-1>0){
     *      genTree(depth-1,children,data);
     *    }
     *    _.append(data,...children);
     *  });
     * }
     *
     * const roots = addChildren(1);
     * const data = [];
     * genTree(2,roots,data);
     * _.insert(data,0,...roots);
     * let tree = _.arrayToTree(data,'id','pid');
     *
     * console.log('Before sort---------------');
     * _.walkTree(_.cloneDeep(tree),(parentNode,node,chain)=>console.log('node',node.name,'sortNo',node.sortNo))
     * _.sortTree(tree,(a,b)=>a.sortNo - b.sortNo);
     * console.log('After sort---------------');
     * _.walkTree(tree,(parentNode,node,chain)=>console.log('node',node.name,'sortNo',node.sortNo))
     *
     * @param treeNodes 一组节点或一个节点
     * @param comparator (a,b) 排序函数
     * @param {object} options 自定义选项
     * @param options.childrenKey 包含子节点容器的key。默认'children'
     *
     * @since 1.0.0
     */
    function sortTree(treeNodes, comparator, options = { childrenKey: 'children' }) {
        const childrenKey = options.childrenKey || 'children';
        const data = isArray(treeNodes)
            ? treeNodes
            : [treeNodes];
        data.sort((a, b) => comparator(a, b));
        data.forEach((node) => {
            if (!isEmpty(node[childrenKey])) {
                sortTree(node[childrenKey], comparator);
            }
        });
    }

    var tree = /*#__PURE__*/Object.freeze({
        __proto__: null,
        arrayToTree: arrayToTree,
        closest: closest,
        filterTree: filterTree,
        findTreeNode: findTreeNode,
        findTreeNodes: findTreeNodes,
        sortTree: sortTree,
        walkTree: walkTree
    });

    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('');
    /**
     * 生成一个指定长度的alphaId并返回。id内容由随机字母表字符组成
     * @example
     * // urN-k0mpetBwboeQ
     * console.log(_.alphaId())
     * // Ii6cPyfw-Ql5YC8OIhVwH1lpGY9x
     * console.log(_.alphaId(28))
     *
     * @param [len=16] id长度
     * @returns alphaId
     * @since 1.0.0
     */
    function alphaId(len) {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(len || 16));
        let rs = '';
        bytes.forEach(b => rs += ALPHABET[b % ALPHABET.length]);
        return rs;
    }

    /**
     * 如果v是null/undefined/NaN中的一个，返回defaultValue
     * @example
     * //"x"
     * console.log(_.defaultTo(null,'x'))
     * //0
     * console.log(_.defaultTo(0,'y'))
     *
     * @param v 任何值
     * @param defaultValue 任何值
     * @returns v或defaultValue
     * @since 0.16.0
     */
    function defaultTo(v, defaultValue) {
        if (v === null || v === undefined || Number.isNaN(v))
            return defaultValue;
        return v;
    }

    /**
     * 为func.js扩展额外函数，扩展后的函数同样具有函数链访问能力
     *
     * @example
     * //增加扩展
     * _.mixin({
     *  select:_.get,
     *  from:_.chain,
     *  where:_.filter,
     *  top:_.first
     * });
     *
     * const libs = [
     *  {name:'func.js',platform:['web','nodejs'],tags:{utils:true},js:true},
     *  {name:'juth2',platform:['web','java'],tags:{utils:false,middleware:true},js:false},
     *  {name:'soya2d',platform:['web'],tags:{utils:true},js:true}
     * ];
     * //查询utils是true的第一行数据的name值
     * console.log(_.from(libs).where({tags:{utils:true}}).top().select('name').value())
     *
     * @param obj 扩展的函数声明
     */
    function mixin(target, obj) {
        functions(obj).forEach((fnName) => {
            const fn = obj[fnName];
            if (target.prototype && target.prototype.constructor.name === 'FuncChain') {
                target.prototype['_' + fnName] = function (...rest) {
                    this._chain.push({
                        fn: fn,
                        params: rest,
                    });
                    return this;
                };
            }
            else {
                target['_' + fnName] = fn;
            }
        });
    }

    /**
     * 当通过非esm方式引用函数库时，函数库会默认挂载全局变量<code>_</code>。
     * 如果项目中存在其它以该变量为命名空间的函数库（如lodash、underscore等）则会发生命名冲突。
     * 该函数可恢复全局变量为挂载前的引用，并返回myfuncs命名空间
     * @example
     * // 返回myfuncs并重置全局命名空间 _
     * console.log(_.noConflict())
     *
     * @returns 返回myfuncs命名空间
     * @since 1.0.0
     */
    function noConflict() {
        const ctx = globalThis;
        if (ctx.myff) {
            ctx._ = ctx.__f_prev;
        }
        return ctx.myff;
    }

    /**
     * 生成一个64bit整数的雪花id并返回，具体格式如下：
     * <code>
     * 0 - timestamp                                       - nodeId       - sequence<br>
     * 0 - [0000000000 0000000000 0000000000 0000000000 0] - [0000000000] - [000000000000]
     * </code>
     * 可用于客户端生成可跟踪统计的id，如定制终端
     * @example
     * // 343155438738309188
     * console.log(_.snowflakeId(123))
     * // 78249955004317758
     * console.log(_.snowflakeId(456,new Date(2022,1,1).getTime()))
     *
     * @param nodeId 节点id，10bit整数
     * @param [epoch=1580486400000] 时间起点，用于计算相对时间戳
     * @returns snowflakeId 由于js精度问题，直接返回字符串而不是number，如果nodeId为空返回 '0000000000000000000'
     * @since 1.0.0
     */
    function snowflakeId(nodeId, epoch) {
        epoch = epoch || 1580486400000;
        if (isNil(nodeId))
            return '0000000000000000000';
        let nowTime = Date.now();
        // 12bits for seq
        if (lastTimeStamp === nowTime) {
            sequence += randi(1, 9);
            if (sequence > 0xfff) {
                nowTime = _getNextTime(lastTimeStamp);
                sequence = randi(0, 99);
            }
        }
        else {
            sequence = randi(0, 99);
        }
        lastTimeStamp = nowTime;
        // 41bits for time
        const timeOffset = (nowTime - epoch).toString(2);
        // 10bits for nodeId
        const nodeBits = padEnd((nodeId % 0x3ff).toString(2) + '', 10, '0');
        // 12bits for seq
        const seq = padZ(sequence.toString(2) + '', 12);
        return BigInt(`0b${timeOffset}${nodeBits}${seq}`).toString();
    }
    let lastTimeStamp = -1;
    let sequence = 0;
    const _getNextTime = (lastTime) => {
        let t = Date.now();
        while (t <= lastTime) {
            t = Date.now();
        }
        return t;
    };

    /**
     * 调用iteratee函数n次，并将历次调用的返回值数组作为结果返回
     * @example
     * //['0',...,'4']
     * console.log(_.times(5,String))
     * //[[0],[1]]
     * console.log(_.times(2,_.toArray))
     *
     * @param n 迭代次数
     * @param iteratee 每次迭代调用函数
     * @returns 返回值数组
     * @since 0.17.0
     */
    function times(n, iteratee) {
        return range(n).map(iteratee);
    }

    /**
     * 返回一个全局的整数id，序号从0开始。可以用于前端列表编号等用途
     *
     * @example
     * //func_0
     * console.log(_.uniqueId('func'))
     * //1
     * console.log(_.uniqueId())
     *
     * @param [prefix] id前缀
     * @returns 唯一id
     * @since 0.16.0
     */
    function uniqueId(prefix) {
        return (prefix !== undefined ? prefix + '_' : '') + seed++;
    }
    let seed = 0;

    const VARIANTS = ['8', '9', 'a', 'b'];
    /**
     * 生成一个32/36个字符组件的随机uuid(v4)并返回
     * @example
     * // ddfd73a5-62ac-4412-ad2b-fd495f766caf
     * console.log(_.uuid(true))
     * // ddfd73a562ac4412ad2bfd495f766caf
     * console.log(_.uuid())
     *
     * @param delimiter 是否生成分隔符
     * @returns uuid
     * @since 1.0.0
     */
    function uuid(delimiter) {
        let uuid = '';
        if (globalThis.crypto && globalThis.crypto.randomUUID) {
            // only in https
            uuid = globalThis.crypto.randomUUID();
        }
        else {
            const r32 = Math.random();
            const r16 = Math.random();
            const p1Num = Math.floor(r32 * (0xffffffff - 0x10000000)) + 0x10000000;
            const p1 = p1Num.toString(16);
            const p2Num = Math.floor(r16 * (0xffff - 0x1000)) + 0x1000;
            const p2 = p2Num.toString(16);
            const p3 = substring((p2Num << 1).toString(16), 0, 3);
            const p4 = substring((p2Num >> 1).toString(16), 0, 3);
            let p5 = Date.now().toString(16);
            p5 =
                substring((p1Num >> 1).toString(16), 0, 6) +
                substring(p5, p5.length - 6, p5.length);
            uuid =
                p1 + '-' + p2 + '-4' + p3 + '-' + VARIANTS[randi(0, 3)] + p4 + '-' + p5;
        }
        return delimiter ? uuid : uuid.replace(/-/g, '');
    }

    var utils = /*#__PURE__*/Object.freeze({
        __proto__: null,
        alphaId: alphaId,
        defaultTo: defaultTo,
        identity: identity,
        iteratee: iteratee,
        matcher: matcher,
        mixin: mixin,
        noConflict: noConflict,
        noop: noop,
        snowflakeId: snowflakeId,
        times: times,
        toPath: toPath,
        uniqueId: uniqueId,
        uuid: uuid
    });

    /* eslint-disable no-invalid-this */
    /* eslint-disable require-jsdoc */
    /* eslint-disable max-len */
    /**
     * 函数链操作相关函数
     * @author holyhigh
     */
    /**
     * chain 函数集
     */
    class ChainFx {
        append(...values) { return get(FuncChain.prototype, '_append').call(this, ...arguments); }
        chunk(size = 1) { return get(FuncChain.prototype, '_chunk').call(this, ...arguments); }
        compact() { return get(FuncChain.prototype, '_compact').call(this, ...arguments); }
        concat() { return get(FuncChain.prototype, '_concat').call(this, ...arguments); }
        except() { return get(FuncChain.prototype, '_except').call(this, ...arguments); }
        fill(value, start = 0, end) { return get(FuncChain.prototype, '_fill').call(this, ...arguments); }
        findIndex(predicate, fromIndex) { return get(FuncChain.prototype, '_findIndex').call(this, ...arguments); }
        findLastIndex(predicate, fromIndex) { return get(FuncChain.prototype, '_findLastIndex').call(this, ...arguments); }
        flat(depth = 1) { return get(FuncChain.prototype, '_flat').call(this, ...arguments); }
        flatDeep() { return get(FuncChain.prototype, '_flatDeep').call(this, ...arguments); }
        insert(index, ...values) { return get(FuncChain.prototype, '_insert').call(this, ...arguments); }
        intersect() { return get(FuncChain.prototype, '_intersect').call(this, ...arguments); }
        join(separator) { return get(FuncChain.prototype, '_join').call(this, ...arguments); }
        pop(index) { return get(FuncChain.prototype, '_pop').call(this, ...arguments); }
        pull(...values) { return get(FuncChain.prototype, '_pull').call(this, ...arguments); }
        range(end, step) { return get(FuncChain.prototype, '_range').call(this, ...arguments); }
        remove(predicate) { return get(FuncChain.prototype, '_remove').call(this, ...arguments); }
        reverse() { return get(FuncChain.prototype, '_reverse').call(this, ...arguments); }
        slice(begin, end) { return get(FuncChain.prototype, '_slice').call(this, ...arguments); }
        sortedIndex(value) { return get(FuncChain.prototype, '_sortedIndex').call(this, ...arguments); }
        sortedIndexBy(value, itee) { return get(FuncChain.prototype, '_sortedIndexBy').call(this, ...arguments); }
        union() { return get(FuncChain.prototype, '_union').call(this, ...arguments); }
        uniq() { return get(FuncChain.prototype, '_uniq').call(this, ...arguments); }
        uniqBy(itee) { return get(FuncChain.prototype, '_uniqBy').call(this, ...arguments); }
        unzip() { return get(FuncChain.prototype, '_unzip').call(this, ...arguments); }
        without(...values) { return get(FuncChain.prototype, '_without').call(this, ...arguments); }
        zip() { return get(FuncChain.prototype, '_zip').call(this, ...arguments); }
        zipObject(values) { return get(FuncChain.prototype, '_zipObject').call(this, ...arguments); }
        zipWith() { return get(FuncChain.prototype, '_zipWith').call(this, ...arguments); }
        countBy(itee) { return get(FuncChain.prototype, '_countBy').call(this, ...arguments); }
        every(predicate) { return get(FuncChain.prototype, '_every').call(this, ...arguments); }
        filter(predicate) { return get(FuncChain.prototype, '_filter').call(this, ...arguments); }
        find(predicate) { return get(FuncChain.prototype, '_find').call(this, ...arguments); }
        findLast(predicate) { return get(FuncChain.prototype, '_findLast').call(this, ...arguments); }
        first() { return get(FuncChain.prototype, '_first').call(this, ...arguments); }
        flatMap(itee, depth) { return get(FuncChain.prototype, '_flatMap').call(this, ...arguments); }
        flatMapDeep(itee) { return get(FuncChain.prototype, '_flatMapDeep').call(this, ...arguments); }
        groupBy(itee) { return get(FuncChain.prototype, '_groupBy').call(this, ...arguments); }
        includes(value, fromIndex) { return get(FuncChain.prototype, '_includes').call(this, ...arguments); }
        initial() { return get(FuncChain.prototype, '_initial').call(this, ...arguments); }
        keyBy(itee) { return get(FuncChain.prototype, '_keyBy').call(this, ...arguments); }
        last() { return get(FuncChain.prototype, '_last').call(this, ...arguments); }
        map(itee) { return get(FuncChain.prototype, '_map').call(this, ...arguments); }
        partition(predicate) { return get(FuncChain.prototype, '_partition').call(this, ...arguments); }
        reduce(callback, initialValue) { return get(FuncChain.prototype, '_reduce').call(this, ...arguments); }
        reject(predicate) { return get(FuncChain.prototype, '_reject').call(this, ...arguments); }
        sample() { return get(FuncChain.prototype, '_sample').call(this, ...arguments); }
        sampleSize(count) { return get(FuncChain.prototype, '_sampleSize').call(this, ...arguments); }
        shuffle() { return get(FuncChain.prototype, '_shuffle').call(this, ...arguments); }
        size() { return get(FuncChain.prototype, '_size').call(this, ...arguments); }
        some(predicate) { return get(FuncChain.prototype, '_some').call(this, ...arguments); }
        sort(comparator) { return get(FuncChain.prototype, '_sort').call(this, ...arguments); }
        sortBy(itee) { return get(FuncChain.prototype, '_sortBy').call(this, ...arguments); }
        tail() { return get(FuncChain.prototype, '_tail').call(this, ...arguments); }
        take(length) { return get(FuncChain.prototype, '_take').call(this, ...arguments); }
        takeRight(length) { return get(FuncChain.prototype, '_takeRight').call(this, ...arguments); }
        toArray() { return get(FuncChain.prototype, '_toArray').call(this, ...arguments); }
        addTime(amount, type) { return get(FuncChain.prototype, '_addTime').call(this, ...arguments); }
        compareDate(date2, type) { return get(FuncChain.prototype, '_compareDate').call(this, ...arguments); }
        formatDate(pattern) { return get(FuncChain.prototype, '_formatDate').call(this, ...arguments); }
        getDayOfYear() { return get(FuncChain.prototype, '_getDayOfYear').call(this, ...arguments); }
        getWeekOfMonth() { return get(FuncChain.prototype, '_getWeekOfMonth').call(this, ...arguments); }
        getWeekOfYear() { return get(FuncChain.prototype, '_getWeekOfYear').call(this, ...arguments); }
        isLeapYear() { return get(FuncChain.prototype, '_isLeapYear').call(this, ...arguments); }
        isSameDay(date2) { return get(FuncChain.prototype, '_isSameDay').call(this, ...arguments); }
        now() { return get(FuncChain.prototype, '_now').call(this, ...arguments); }
        toDate() { return get(FuncChain.prototype, '_toDate').call(this, ...arguments); }
        after(count) { return get(FuncChain.prototype, '_after').call(this, ...arguments); }
        alt(interceptor1, interceptor2) { return get(FuncChain.prototype, '_alt').call(this, ...arguments); }
        bind(thisArg, ...args) { return get(FuncChain.prototype, '_bind').call(this, ...arguments); }
        bindAll(...methodNames) { return get(FuncChain.prototype, '_bindAll').call(this, ...arguments); }
        call(...args) { return get(FuncChain.prototype, '_call').call(this, ...arguments); }
        compose() { return get(FuncChain.prototype, '_compose').call(this, ...arguments); }
        debounce(wait, immediate = false) { return get(FuncChain.prototype, '_debounce').call(this, ...arguments); }
        delay(wait, ...args) { return get(FuncChain.prototype, '_delay').call(this, ...arguments); }
        fval(args, context) { return get(FuncChain.prototype, '_fval').call(this, ...arguments); }
        once() { return get(FuncChain.prototype, '_once').call(this, ...arguments); }
        partial(...args) { return get(FuncChain.prototype, '_partial').call(this, ...arguments); }
        tap(interceptor) { return get(FuncChain.prototype, '_tap').call(this, ...arguments); }
        throttle(wait, options) { return get(FuncChain.prototype, '_throttle').call(this, ...arguments); }
        isArray() { return get(FuncChain.prototype, '_isArray').call(this, ...arguments); }
        isArrayLike() { return get(FuncChain.prototype, '_isArrayLike').call(this, ...arguments); }
        isBlank() { return get(FuncChain.prototype, '_isBlank').call(this, ...arguments); }
        isBoolean() { return get(FuncChain.prototype, '_isBoolean').call(this, ...arguments); }
        isDate() { return get(FuncChain.prototype, '_isDate').call(this, ...arguments); }
        isDefined() { return get(FuncChain.prototype, '_isDefined').call(this, ...arguments); }
        isElement() { return get(FuncChain.prototype, '_isElement').call(this, ...arguments); }
        isEmpty() { return get(FuncChain.prototype, '_isEmpty').call(this, ...arguments); }
        isEqual(b) { return get(FuncChain.prototype, '_isEqual').call(this, ...arguments); }
        isEqualWith(b, comparator) { return get(FuncChain.prototype, '_isEqualWith').call(this, ...arguments); }
        isError() { return get(FuncChain.prototype, '_isError').call(this, ...arguments); }
        isFinite() { return get(FuncChain.prototype, '_isFinite').call(this, ...arguments); }
        isFunction() { return get(FuncChain.prototype, '_isFunction').call(this, ...arguments); }
        isInteger() { return get(FuncChain.prototype, '_isInteger').call(this, ...arguments); }
        isIterator() { return get(FuncChain.prototype, '_isIterator').call(this, ...arguments); }
        isLowerCaseChar() { return get(FuncChain.prototype, '_isLowerCaseChar').call(this, ...arguments); }
        isMap() { return get(FuncChain.prototype, '_isMap').call(this, ...arguments); }
        isMatch(props) { return get(FuncChain.prototype, '_isMatch').call(this, ...arguments); }
        isMatchWith(props, comparator) { return get(FuncChain.prototype, '_isMatchWith').call(this, ...arguments); }
        isNaN() { return get(FuncChain.prototype, '_isNaN').call(this, ...arguments); }
        isNative() { return get(FuncChain.prototype, '_isNative').call(this, ...arguments); }
        isNil() { return get(FuncChain.prototype, '_isNil').call(this, ...arguments); }
        isNode() { return get(FuncChain.prototype, '_isNode').call(this, ...arguments); }
        isNull() { return get(FuncChain.prototype, '_isNull').call(this, ...arguments); }
        isNumber() { return get(FuncChain.prototype, '_isNumber').call(this, ...arguments); }
        isNumeric() { return get(FuncChain.prototype, '_isNumeric').call(this, ...arguments); }
        isObject() { return get(FuncChain.prototype, '_isObject').call(this, ...arguments); }
        isPlainObject() { return get(FuncChain.prototype, '_isPlainObject').call(this, ...arguments); }
        isPrimitive() { return get(FuncChain.prototype, '_isPrimitive').call(this, ...arguments); }
        isRegExp() { return get(FuncChain.prototype, '_isRegExp').call(this, ...arguments); }
        isSafeInteger() { return get(FuncChain.prototype, '_isSafeInteger').call(this, ...arguments); }
        isSet() { return get(FuncChain.prototype, '_isSet').call(this, ...arguments); }
        isString() { return get(FuncChain.prototype, '_isString').call(this, ...arguments); }
        isSymbol() { return get(FuncChain.prototype, '_isSymbol').call(this, ...arguments); }
        isUndefined() { return get(FuncChain.prototype, '_isUndefined').call(this, ...arguments); }
        isUpperCaseChar() { return get(FuncChain.prototype, '_isUpperCaseChar').call(this, ...arguments); }
        isWeakMap() { return get(FuncChain.prototype, '_isWeakMap').call(this, ...arguments); }
        isWeakSet() { return get(FuncChain.prototype, '_isWeakSet').call(this, ...arguments); }
        add(b) { return get(FuncChain.prototype, '_add').call(this, ...arguments); }
        divide(b) { return get(FuncChain.prototype, '_divide').call(this, ...arguments); }
        max() { return get(FuncChain.prototype, '_max').call(this, ...arguments); }
        mean() { return get(FuncChain.prototype, '_mean').call(this, ...arguments); }
        median() { return get(FuncChain.prototype, '_median').call(this, ...arguments); }
        min() { return get(FuncChain.prototype, '_min').call(this, ...arguments); }
        minmax(max, value) { return get(FuncChain.prototype, '_minmax').call(this, ...arguments); }
        multiply(b) { return get(FuncChain.prototype, '_multiply').call(this, ...arguments); }
        randf(max) { return get(FuncChain.prototype, '_randf').call(this, ...arguments); }
        randi(max) { return get(FuncChain.prototype, '_randi').call(this, ...arguments); }
        subtract(b) { return get(FuncChain.prototype, '_subtract').call(this, ...arguments); }
        sum() { return get(FuncChain.prototype, '_sum').call(this, ...arguments); }
        formatNumber(pattern = '#,##0.00') { return get(FuncChain.prototype, '_formatNumber').call(this, ...arguments); }
        gt(b) { return get(FuncChain.prototype, '_gt').call(this, ...arguments); }
        gte(b) { return get(FuncChain.prototype, '_gte').call(this, ...arguments); }
        inRange(start, end) { return get(FuncChain.prototype, '_inRange').call(this, ...arguments); }
        lt(b) { return get(FuncChain.prototype, '_lt').call(this, ...arguments); }
        lte(b) { return get(FuncChain.prototype, '_lte').call(this, ...arguments); }
        toInteger() { return get(FuncChain.prototype, '_toInteger').call(this, ...arguments); }
        toNumber() { return get(FuncChain.prototype, '_toNumber').call(this, ...arguments); }
        assign(...sources) { return get(FuncChain.prototype, '_assign').call(this, ...arguments); }
        assignWith(...sources) { return get(FuncChain.prototype, '_assignWith').call(this, ...arguments); }
        clone() { return get(FuncChain.prototype, '_clone').call(this, ...arguments); }
        cloneDeep() { return get(FuncChain.prototype, '_cloneDeep').call(this, ...arguments); }
        cloneDeepWith(handler, skip = (value, key) => false) { return get(FuncChain.prototype, '_cloneDeepWith').call(this, ...arguments); }
        cloneWith(handler, skip = (value, key) => false) { return get(FuncChain.prototype, '_cloneWith').call(this, ...arguments); }
        defaults(...sources) { return get(FuncChain.prototype, '_defaults').call(this, ...arguments); }
        defaultsDeep(...sources) { return get(FuncChain.prototype, '_defaultsDeep').call(this, ...arguments); }
        eq(b) { return get(FuncChain.prototype, '_eq').call(this, ...arguments); }
        findKey(predicate) { return get(FuncChain.prototype, '_findKey').call(this, ...arguments); }
        fromPairs() { return get(FuncChain.prototype, '_fromPairs').call(this, ...arguments); }
        functions() { return get(FuncChain.prototype, '_functions').call(this, ...arguments); }
        get(path, defaultValue) { return get(FuncChain.prototype, '_get').call(this, ...arguments); }
        has(key) { return get(FuncChain.prototype, '_has').call(this, ...arguments); }
        keys() { return get(FuncChain.prototype, '_keys').call(this, ...arguments); }
        keysIn() { return get(FuncChain.prototype, '_keysIn').call(this, ...arguments); }
        merge(...sources) { return get(FuncChain.prototype, '_merge').call(this, ...arguments); }
        mergeWith(...sources) { return get(FuncChain.prototype, '_mergeWith').call(this, ...arguments); }
        omit(...props) { return get(FuncChain.prototype, '_omit').call(this, ...arguments); }
        omitBy(predicate) { return get(FuncChain.prototype, '_omitBy').call(this, ...arguments); }
        parseJSON(ignore = false) { return get(FuncChain.prototype, '_parseJSON').call(this, ...arguments); }
        pick(...props) { return get(FuncChain.prototype, '_pick').call(this, ...arguments); }
        pickBy(predicate) { return get(FuncChain.prototype, '_pickBy').call(this, ...arguments); }
        prop() { return get(FuncChain.prototype, '_prop').call(this, ...arguments); }
        set(path, value) { return get(FuncChain.prototype, '_set').call(this, ...arguments); }
        toObject() { return get(FuncChain.prototype, '_toObject').call(this, ...arguments); }
        toPairs() { return get(FuncChain.prototype, '_toPairs').call(this, ...arguments); }
        unset(path) { return get(FuncChain.prototype, '_unset').call(this, ...arguments); }
        values() { return get(FuncChain.prototype, '_values').call(this, ...arguments); }
        valuesIn() { return get(FuncChain.prototype, '_valuesIn').call(this, ...arguments); }
        camelCase() { return get(FuncChain.prototype, '_camelCase').call(this, ...arguments); }
        capitalize() { return get(FuncChain.prototype, '_capitalize').call(this, ...arguments); }
        endsWith(searchStr, position) { return get(FuncChain.prototype, '_endsWith').call(this, ...arguments); }
        escapeRegExp() { return get(FuncChain.prototype, '_escapeRegExp').call(this, ...arguments); }
        indexOf(search, fromIndex) { return get(FuncChain.prototype, '_indexOf').call(this, ...arguments); }
        kebabCase() { return get(FuncChain.prototype, '_kebabCase').call(this, ...arguments); }
        lastIndexOf(search, fromIndex) { return get(FuncChain.prototype, '_lastIndexOf').call(this, ...arguments); }
        lowerCase() { return get(FuncChain.prototype, '_lowerCase').call(this, ...arguments); }
        lowerFirst() { return get(FuncChain.prototype, '_lowerFirst').call(this, ...arguments); }
        padEnd(len, padString) { return get(FuncChain.prototype, '_padEnd').call(this, ...arguments); }
        padStart(len, padString) { return get(FuncChain.prototype, '_padStart').call(this, ...arguments); }
        padZ(len) { return get(FuncChain.prototype, '_padZ').call(this, ...arguments); }
        pascalCase() { return get(FuncChain.prototype, '_pascalCase').call(this, ...arguments); }
        repeat(count) { return get(FuncChain.prototype, '_repeat').call(this, ...arguments); }
        replace(searchValue, replaceValue) { return get(FuncChain.prototype, '_replace').call(this, ...arguments); }
        replaceAll(searchValue, replaceValue) { return get(FuncChain.prototype, '_replaceAll').call(this, ...arguments); }
        snakeCase() { return get(FuncChain.prototype, '_snakeCase').call(this, ...arguments); }
        split(separator, limit) { return get(FuncChain.prototype, '_split').call(this, ...arguments); }
        startsWith(searchStr, position) { return get(FuncChain.prototype, '_startsWith').call(this, ...arguments); }
        substring(indexStart, indexEnd) { return get(FuncChain.prototype, '_substring').call(this, ...arguments); }
        test(pattern, flags) { return get(FuncChain.prototype, '_test').call(this, ...arguments); }
        toFixed(scale) { return get(FuncChain.prototype, '_toFixed').call(this, ...arguments); }
        toString() { return get(FuncChain.prototype, '_toString').call(this, ...arguments); }
        trim() { return get(FuncChain.prototype, '_trim').call(this, ...arguments); }
        trimEnd() { return get(FuncChain.prototype, '_trimEnd').call(this, ...arguments); }
        trimStart() { return get(FuncChain.prototype, '_trimStart').call(this, ...arguments); }
        truncate(len, options) { return get(FuncChain.prototype, '_truncate').call(this, ...arguments); }
        upperCase() { return get(FuncChain.prototype, '_upperCase').call(this, ...arguments); }
        upperFirst() { return get(FuncChain.prototype, '_upperFirst').call(this, ...arguments); }
        arrayToTree(idKey = 'id', pidKey, options = { childrenKey: 'children', rootParentValue: null, attrMap: undefined, sortKey: '' }) { return get(FuncChain.prototype, '_arrayToTree').call(this, ...arguments); }
        closest(predicate, parentKey) { return get(FuncChain.prototype, '_closest').call(this, ...arguments); }
        filterTree(predicate, options = { childrenKey: 'children' }) { return get(FuncChain.prototype, '_filterTree').call(this, ...arguments); }
        findTreeNode(predicate, options) { return get(FuncChain.prototype, '_findTreeNode').call(this, ...arguments); }
        findTreeNodes(predicate, options) { return get(FuncChain.prototype, '_findTreeNodes').call(this, ...arguments); }
        alphaId() { return get(FuncChain.prototype, '_alphaId').call(this, ...arguments); }
        defaultTo(defaultValue) { return get(FuncChain.prototype, '_defaultTo').call(this, ...arguments); }
        matcher() { return get(FuncChain.prototype, '_matcher').call(this, ...arguments); }
        noConflict() { return get(FuncChain.prototype, '_noConflict').call(this, ...arguments); }
        snowflakeId(epoch) { return get(FuncChain.prototype, '_snowflakeId').call(this, ...arguments); }
        times(iteratee) { return get(FuncChain.prototype, '_times').call(this, ...arguments); }
        toPath() { return get(FuncChain.prototype, '_toPath').call(this, ...arguments); }
        uniqueId() { return get(FuncChain.prototype, '_uniqueId').call(this, ...arguments); }
        uuid() { return get(FuncChain.prototype, '_uuid').call(this, ...arguments); }
    } //#cfx
    /**
     * 用于定义FuncChain对象并构造函数链
     * 注意，该类仅用于内部构造函数链
     */
    class FuncChain extends ChainFx {
        /**
         * @internal
         */
        constructor(v) {
            super();
            this._wrappedValue = v;
            this._chain = [];
        }
        /**
         * 惰性计算。执行函数链并返回计算结果
         * @example
         * //2-4
         * console.log(_([1,2,3,4]).map(v=>v+1).filter(v=>v%2===0).take(2).join('-').value())
         * //[1,2,2,1]
         * console.log(_(["{a:1,b:2}","{a:2,b:1}"]).map((v) => _.fval(v)).map(v=>[v.a,v.b]).join().value())
         * //[1,2,3,4]
         * console.log(_([1,2,3,4]).value())
         *
         * @returns 执行函数链返回的值
         */
        value() {
            let comprehension = isArrayLike(this._wrappedValue)
                ? createComprehension()
                : null;
            const maxChainIndex = this._chain.length - 1;
            return this._chain.reduce((acc, v, i) => {
                const params = [acc, ...v.params];
                if (comprehension) {
                    let rs;
                    const sig = buildComprehension(comprehension, v.fn, v.params);
                    if (sig > 0 || (!sig && maxChainIndex === i)) {
                        rs = execComprehension(comprehension, acc);
                        if (comprehension.tap) {
                            comprehension.tap(rs);
                        }
                        comprehension = null;
                    }
                    if (sig > 1) {
                        comprehension = createComprehension(v.fn, v.params);
                    }
                    if (rs) {
                        return sig !== 1 ? rs : v.fn(...[rs, ...v.params]);
                    }
                    return acc;
                }
                if (CAN_COMPREHENSIONS.includes(v.fn.name)) {
                    comprehension = createComprehension();
                    return v.fn(...[acc, ...v.params]);
                }
                return v.fn(...params);
            }, this._wrappedValue);
        }
    }
    const CAN_COMPREHENSIONS = [split.name, toArray.name, range.name];
    function createComprehension(fn, params) {
        const comprehension = {
            forEachRight: false,
            goalSettings: [],
            range: [],
            reverse: false,
            count: undefined,
            tap: undefined,
            returnEl: false,
        };
        if (fn && params) {
            buildComprehension(comprehension, fn, params);
        }
        return comprehension;
    }
    function buildComprehension(comprehension, fn, params) {
        const fnName = fn.name;
        switch (fnName) {
            case map.name:
            case filter.name:
                if (size(comprehension.range) > 0 || isDefined(comprehension.count))
                    return 2;
                let fn = params[0];
                if (!isFunction(fn)) {
                    fn = iteratee(params[0]);
                }
                comprehension.goalSettings.push({ type: fnName, fn: fn });
                break;
            case reverse.name:
                if (size(comprehension.range) < 1) {
                    comprehension.forEachRight = !comprehension.forEachRight;
                }
                else {
                    comprehension.reverse = !comprehension.reverse;
                }
                break;
            case slice.name:
                if (size(comprehension.range) > 0)
                    return 2;
                comprehension.range[0] = params[0];
                comprehension.range[1] = params[1];
                break;
            case tail.name:
                if (size(comprehension.range) > 0)
                    return 2;
                comprehension.range[0] = 1;
                comprehension.range[1] = params[1];
                break;
            case take.name:
                if (isUndefined(comprehension.count) || params[0] < comprehension.count) {
                    comprehension.count = params[0];
                }
                break;
            case first.name:
                if (isUndefined(comprehension.count) || 1 < comprehension.count) {
                    comprehension.count = 1;
                    comprehension.returnEl = true;
                }
                break;
            case last.name:
                comprehension.count = 1;
                comprehension.returnEl = true;
                comprehension.forEachRight = true;
                break;
            case tap.name:
                comprehension.tap = params[0];
                break;
            default:
                return 1;
        }
        return 0;
    }
    function execComprehension(comprehension, collection) {
        const targets = [];
        let targetIndex = 0;
        if (!comprehension.count && comprehension.range.length > 0) {
            comprehension.count = comprehension.range[1] - comprehension.range[0];
        }
        const isReverse = comprehension.reverse;
        const count = comprehension.count;
        const gs = comprehension.goalSettings;
        const gsLen = gs.length;
        const range = comprehension.range;
        const hasRange = range.length > 0;
        const forEach = comprehension.forEachRight ? eachRight : each;
        forEach(collection, (v, k) => {
            let t = v;
            // before save target
            for (let i = 0; i < gsLen; i++) {
                const setting = gs[i];
                if (setting.type === map.name) {
                    t = setting.fn(t, k);
                }
                else if (setting.type === filter.name) {
                    if (!setting.fn(t, k)) {
                        return;
                    }
                }
            } // for end
            if (hasRange && targetIndex++ < range[0])
                return;
            if (hasRange && targetIndex > range[1])
                return false;
            if (targets.length === count)
                return false;
            if (isReverse) {
                targets.unshift(t);
            }
            else {
                targets.push(t);
            }
        });
        if (targets.length === 1 && comprehension.returnEl) {
            return targets[0];
        }
        return targets;
    }

    /* eslint-disable require-jsdoc */
    /* eslint-disable no-invalid-this */
    /* eslint-disable max-len */
    const VERSION = "1.13.4"; //#ver
    /**
    * 显式开启myfx的函数链，返回一个包裹了参数v的myfx链式对象。函数链可以链接Myfx提供的所有函数，如
     <p>
    * 函数链使用惰性计算 —— 直到显示调用value()方法时，函数链才会进行计算并返回结果
    * </p>
    ```js
    _.chain([1,2,3,4]).map(v=>v+1).filter(v=>v%2===0).take(2).join('-').value()
    ```

    * 函数链与直接调用方法的区别不仅在于可以链式调用，更在于函数链是基于惰性求值的。
    * 上式中必须通过显式调用`value()`方法才能获取结果，
    * 而只有在`value()`方法调用时整个函数链才进行求值。
    *
    *
    * 惰性求值允许FuncChain实现捷径融合(shortcut fusion) —— 一项基于已有函数对数组循环次数进行大幅减少以提升性能的优化技术。
    * 下面的例子演示了原生函数链和Myfx函数链的性能差异
    * @example
    * let ary = _.range(20000000);
    console.time('native');
    let c = 0;
    let a = ary.map((v)=>{
       c++;
       return v+1;
     }).filter((v) => {
       c++;
       return v%2==0;
     })
     .reverse()
     .slice(1, 4)
    console.timeEnd('native');
    console.log(a, c, '次');//大约600ms左右，循环 40000000 次

    //Myfx
    ary = _.range(20000000);
    console.time('Myfx');
    let x = 0;
    let targets = _(ary)
     .map((v) => {
       x++;
       return v+1;
     })
     .filter((v) => {
       x++;
       return v%2==0;
     })
     .reverse()
     .slice(1, 4)
     .value();
    console.timeEnd('Myfx');
    console.log(targets, x, '次');//大约0.5ms左右，循环 18 次
    *
    * @param v
    * @returns Myfx对象
    */
    function chain(v) {
        return v instanceof FuncChain ? v : new FuncChain(v);
    }
    mixin(FuncChain, {
        ...str,
        ...num,
        ...datetime,
        ...is,
        ...object,
        ...collection,
        ...math,
        ...utils,
        ...functions$1,
        ...array,
        ...template,
        ...tree,
    });
    const myfx = {
        VERSION: VERSION,
        chain,
        ...str,
        ...num,
        ...datetime,
        ...is,
        ...object,
        ...collection,
        ...math,
        ...utils,
        ...functions$1,
        ...array,
        ...template,
        ...tree,
    };
    //bind _
    const ctx = globalThis;
    if (ctx.myff) {
        setTimeout(function () {
            ctx.__f_prev = ctx._;
            ctx._ = myfx;
        }, 0);
    }
    ctx.myfx = myfx;

    /**
     * 共享内容
     */
    const EXP_KEY = /\s+\.?key\s*=/;
    var CollectorType;
    (function (CollectorType) {
        CollectorType[CollectorType["CSS"] = 1] = "CSS";
        CollectorType[CollectorType["COMPUTED"] = 2] = "COMPUTED";
    })(CollectorType || (CollectorType = {}));
    var DecoratorKey;
    (function (DecoratorKey) {
        DecoratorKey["PROPS"] = "__deco_props";
        DecoratorKey["STATES"] = "__deco_states";
        DecoratorKey["COMPUTED"] = "__deco_computed";
        DecoratorKey["WATCH"] = "__deco_watch";
        DecoratorKey["EVENTS"] = "__deco_events";
    })(DecoratorKey || (DecoratorKey = {}));
    var Mode;
    (function (Mode) {
        Mode["Prod"] = "prod";
        Mode["Dev"] = "dev";
    })(Mode || (Mode = {}));

    function showError(msg) {
        console.error(`[CompElem]`, msg);
    }
    function showTagError(tagName, msg) {
        console.error(`[CompElem <${tagName}>]`, msg);
    }
    function showWarn(...args) {
        console.warn(`[CompElem]`, ...args);
    }
    //为依赖收集提供标准地址
    function _toUpdatePath(varPath) {
        return toPath(varPath).join("-");
    }
    //获取父类构造
    function _getSuper(cls) {
        return Object.getPrototypeOf(cls);
    }
    function isBooleanProp(type) {
        return type === Boolean || some(type, t => t === Boolean);
    }
    //返回boolean值或非boolean值
    function getBooleanValue(v) {
        let val = v;
        if (isString(v) && /(?:^true$)|(?:^false$)/.test(val)) {
            val = val === 'true' ? true : false;
        }
        else if (isUndefined(val) || isBlank(val)) {
            val = true;
        }
        return val;
    }

    //装饰器类型
    var DecoratorType;
    (function (DecoratorType) {
        DecoratorType["CLASS"] = "class";
        DecoratorType["FIELD"] = "field";
        DecoratorType["METHOD"] = "method";
    })(DecoratorType || (DecoratorType = {}));
    /**
     * 用于构造装饰器
     * @author holyhigh2
     */
    class Decorator {
        /**
         * 优先级，越大越先执行
         */
        static get priority() {
            return 0;
        }
    }

    const GetKeyFnName = 'getKey';
    const _DecoratorsKey = '__decorators';
    const _DecoratorMap = new WeakMap;
    /**
     * 装饰器包装类
     * 用于框架内部，表示class上的一个装饰器属性定义
     * 该定义在实例初始化时会产生装饰器实例属性
     */
    class DecoratorWrapper {
        //execute 参数
        args;
        //装饰器参数
        metadata;
        decoratorClass;
        instanceMap;
        key; //装饰器唯一key
        priority = 0;
        constructor(args, metadata, decoratorClass) {
            this.args = args;
            this.metadata = metadata;
            this.decoratorClass = decoratorClass;
            this.priority = get(decoratorClass, 'priority', 0);
            this.instanceMap = new WeakMap;
        }
        //在组件构造时调用
        create(comp) {
            let ins = new this.decoratorClass(...this.args);
            //1. 校验targets
            let targets = ins.targets;
            let decoType = undefined;
            let descriptor = this.metadata[2];
            if (isObject(descriptor) && isDefined(get(descriptor, 'configurable'))) {
                decoType = DecoratorType.METHOD;
            }
            else if (isUndefined(this.metadata[2])) {
                decoType = DecoratorType.FIELD;
            }
            if (isEmpty(targets) || !decoType || !targets.includes(decoType)) {
                showError(`Decorator '${this.decoratorClass.name}' is out of targets, expect '${targets.join(',')}' bug got '${decoType}'`);
                return;
            }
            ins.created(comp, ...this.metadata);
            this.instanceMap.set(comp, ins);
        }
        beforeMount(comp, setReactive) {
            let ins = this.instanceMap.get(comp);
            ins.beforeMount(comp, setReactive, ...this.metadata);
        }
        mounted(comp, setReactive) {
            let ins = this.instanceMap.get(comp);
            ins.mounted(comp, setReactive, ...this.metadata);
        }
        updated(comp, changed) {
            this.instanceMap.get(comp).updated(comp, changed);
        }
    }
    //每个装饰器类中不同组件类中的重复key
    const DecoKeyMap = new WeakMap();
    /**
     * 该函数用于创建一个装饰器
     * @param decoClass 装饰器构造
     * @returns 装饰器函数
     */
    function decorator(decoClass) {
        let fn = (...args) => {
            return (...metadata) => {
                let ctor = metadata[0].constructor;
                let ary = ctor[_DecoratorsKey];
                if (!has(ctor, _DecoratorsKey)) {
                    //继承父类
                    let proto = Object.getPrototypeOf(ctor);
                    ary = proto ? concat(proto[_DecoratorsKey] ?? []) : [];
                    Reflect.defineProperty(ctor, _DecoratorsKey, {
                        configurable: false,
                        enumerable: false,
                        value: ary
                    });
                }
                let kMap = {};
                let k;
                let getKey = decoClass[GetKeyFnName];
                if (getKey) {
                    let compMap = DecoKeyMap.get(decoClass);
                    if (!compMap) {
                        compMap = new WeakMap;
                        DecoKeyMap.set(decoClass, compMap);
                    }
                    kMap = compMap.get(ctor);
                    if (!kMap) {
                        kMap = {};
                        compMap.set(ctor, kMap);
                    }
                    k = getKey(...args);
                    if (kMap[k])
                        return kMap[k];
                }
                let dw = new DecoratorWrapper(args, metadata, decoClass);
                kMap[k] = dw;
                ary?.push(dw);
                return dw;
            };
        };
        _DecoratorMap.set(fn, true);
        return fn;
    }

    //每个类需要监控的属性
    const ObservedAttrsMap = new WeakMap;
    function prop(options) {
        if (arguments.length === 1) {
            return (target, propertyKey, descriptor) => {
                options.required = options.required || false;
                options.attribute = options.attribute === false ? false : true;
                defineProp(target, propertyKey, options, descriptor);
            };
        }
        let target = arguments[0], propertyKey = arguments[1], descriptor = arguments[2];
        options = { type: undefined, required: false, attribute: true };
        if (descriptor && typeof descriptor.type === 'function') {
            options = defaults(descriptor, options);
            descriptor = undefined;
        }
        defineProp(target, propertyKey, options, descriptor);
    }
    function defineProp(target, propertyKey, options, descriptor) {
        if (!isLowerCaseChar(propertyKey[0])) {
            showError(`Prop '${propertyKey}' must be in CamelCase`);
        }
        let attrSet;
        if (!has(target.constructor, DecoratorKey.PROPS)) {
            const mixinProps = {};
            let parentCtor = target.constructor;
            while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
                merge(mixinProps, parentCtor[DecoratorKey.PROPS] ? cloneDeep(parentCtor[DecoratorKey.PROPS]) : {});
            }
            Reflect.defineProperty(target.constructor, DecoratorKey.PROPS, {
                configurable: false,
                enumerable: false,
                value: mixinProps
            });
            attrSet = new Set();
            each(mixinProps, (v, k) => {
                if (v.attribute) {
                    let kbb = kebabCase(k);
                    attrSet?.add(kbb);
                }
            });
            ObservedAttrsMap.set(target.constructor, attrSet);
        }
        if (descriptor) {
            if (descriptor.get)
                options.getter = descriptor.get;
            if (descriptor.set)
                options.setter = descriptor.set;
        }
        if (options.attribute) {
            if (!attrSet) {
                attrSet = ObservedAttrsMap.get(target.constructor);
            }
            let kbb = kebabCase(propertyKey);
            attrSet?.add(kbb);
        }
        //observeAttrs
        if (!has(target.constructor, 'observedAttributes')) {
            target.constructor.observedAttributes = [];
        }
        target.constructor.observedAttributes = toArray(attrSet);
        target.constructor[DecoratorKey.PROPS][propertyKey] = options;
    }
    //内部接口
    const emptySet = new Set;
    function _getObservedAttrs(ctor) {
        return ObservedAttrsMap.get(ctor) ?? emptySet;
    }

    /**
     * 属性定义
     */
    var EnterPointType;
    (function (EnterPointType) {
        EnterPointType["ATTR"] = "attr";
        EnterPointType["PROP"] = "prop";
        EnterPointType["TEXT"] = "text";
        EnterPointType["CLASS"] = "class";
        EnterPointType["STYLE"] = "style";
        EnterPointType["SLOT"] = "slot";
        EnterPointType["TAG"] = "tag"; //在标签内但不是属性内
    })(EnterPointType || (EnterPointType = {}));
    var DirectiveUpdateTag;
    (function (DirectiveUpdateTag) {
        DirectiveUpdateTag["NONE"] = "NONE";
        DirectiveUpdateTag["REMOVE"] = "REMOVE";
        DirectiveUpdateTag["REPLACE"] = "REPLACE";
        DirectiveUpdateTag["UPDATE"] = "UPDATE";
        DirectiveUpdateTag["APPEND"] = "APPEND";
    })(DirectiveUpdateTag || (DirectiveUpdateTag = {}));
    /**
     * 视图更新点
     */
    class UpdatePoint {
        //在子视图中的平级key
        key;
        //表达式对应的vars位置
        varIndex;
        value;
        isText = false;
        //是否模板
        // isTmpl: boolean = false;
        isDirective = false;
        //表达式所在节点，可能是元素/文本
        node;
        //如果是文本位置，与node一起构成插入范围
        textNode;
        //是否组件
        isComponent = false;
        //如果在属性中，属性名
        attrName;
        //属性值模板
        attrTmpl;
        //是否组件属性
        isProp = false;
        //是否布尔属性
        isToggleProp = false;
        //是否被更新，对于 key，event，ref等属性不需要更新，仅用于占位
        notUpdated;
        constructor(varIndex, node, attrName, attrTmpl) {
            this.varIndex = varIndex;
            this.node = node;
            if (attrName)
                this.attrName = attrName;
            if (attrTmpl) {
                this.attrTmpl = attrTmpl;
            }
        }
    }
    const PATH_SEPARATOR = '-';

    /**
     * 用于提供全局state状态管理
     * @author holyhigh2
     */
    const EVENT_UPDATE = 'update';
    const Collector = {
        collectWatch(comp, updater, subPath) {
            let collectVarMap = WATCH_MAP.get(comp);
            if (!collectVarMap) {
                collectVarMap = {};
                WATCH_MAP.set(comp, collectVarMap);
            }
            let list = collectVarMap[subPath];
            if (!list)
                list = collectVarMap[subPath] = [];
            list.push(updater);
        },
        startCollect(comp, type) {
            this.__collectType = type;
            this.__collecting = comp;
        },
        setUpdater(updater) {
            this.__updater = updater;
        },
        endCollect() {
            this.__collecting = null;
        },
        //仅用于指令在构造时获取
        __directiveQ: [],
        setDirectiveQ(val) {
            let lastVar = last(this.__directiveQ);
            const vj = val ? val.join(',') : '';
            const lj = lastVar ? lastVar.join(',') : '';
            if (lastVar && vj === lj)
                return;
            if (lastVar && lastVar.length < val.length && startsWith(vj, lj)) {
                this.__directiveQ[this.__directiveQ.length - 1] = val;
                return;
            }
            this.__directiveQ.push(val);
        },
        popDirectiveQ() {
            let rs = concat(this.__directiveQ);
            this.__directiveQ = [];
            return rs;
        },
        startRender(context) {
            this.__renderCollecting = true;
            this.__renderContext = context;
        },
        endRender(component) {
            //注册依赖
            this.__renderCollection.forEach((varPath) => {
                component._regDeps(varPath, this.__renderContext);
            });
            this.__renderCollection.clear();
            this.__renderCollecting = false;
            this.__renderContext = null;
        },
        collect(prop) {
            this.__renderCollection.add(prop);
        },
        clear() {
            this.__directiveQ = [];
        },
        __updater: null,
        __collecting: null,
        __collectType: -1,
        __renderCollection: new Set(),
        __renderContext: null,
        __renderCollecting: false,
        __skipCheck: false
    };
    const OBJECT_META_DATA = new WeakMap();
    const OBJECT_VAR_PATH = new WeakMap();
    //存储每个组件的computed/css/watch依赖
    const COMPUTED_MAP = new WeakMap();
    const CSS_MAP = new WeakMap();
    const WATCH_MAP = new WeakMap();
    //缓存已经创建的proxy对象，避免重复创建
    const PROXY_MAP = new WeakMap();
    /**
     * @param obj
     * @param context
     * @returns
     */
    function reactive(obj, context) {
        if (!isObject(obj))
            return obj;
        if (PROXY_MAP.has(obj))
            return PROXY_MAP.get(obj);
        if (OBJECT_META_DATA.has(obj))
            return obj;
        const proxyObject = new Proxy(obj, {
            get(target, prop, receiver) {
                if (!prop)
                    return undefined;
                const value = Reflect.get(target, prop, receiver);
                if (isSymbol(prop))
                    return value;
                if (prop === 'length' && isArray(target))
                    return value;
                let chain = OBJECT_VAR_PATH.get(receiver) ?? [];
                let subChain = concat(chain, [prop]);
                let hasProp = prop in target;
                if ((Collector.__renderCollecting || Collector.__collecting) && ((hasProp && target.hasOwnProperty(prop)) || !hasProp)) {
                    let subChainStr = subChain.join(PATH_SEPARATOR);
                    if (Collector.__renderCollecting) {
                        Collector.collect(_toUpdatePath(subChain));
                        Collector.setDirectiveQ(subChain);
                    }
                    else if (Collector.__collecting) {
                        let collectVarMap;
                        switch (Collector.__collectType) {
                            case CollectorType.COMPUTED:
                                collectVarMap = COMPUTED_MAP.get(Collector.__collecting);
                                if (!collectVarMap) {
                                    collectVarMap = {};
                                    COMPUTED_MAP.set(Collector.__collecting, collectVarMap);
                                }
                                break;
                            case CollectorType.CSS:
                                collectVarMap = CSS_MAP.get(Collector.__collecting);
                                if (!collectVarMap) {
                                    collectVarMap = {};
                                    CSS_MAP.set(Collector.__collecting, collectVarMap);
                                }
                                break;
                        }
                        let list = collectVarMap[subChainStr];
                        if (!list)
                            list = collectVarMap[subChainStr] = [];
                        list.push(Collector.__updater);
                    }
                }
                const meta = OBJECT_META_DATA.get(receiver);
                let sourceContext = meta.from;
                let stateDefs = get(sourceContext.constructor, DecoratorKey.STATES);
                let shallow = get(stateDefs, [prop, 'shallow']);
                if (shallow)
                    return value;
                let reactiveVal = value;
                if (isObject(value) && !isFunction(value) && !(value instanceof Node) && !Object.isFrozen(value)) {
                    let pathMap = meta.pathMap;
                    let deps = meta.contextSet;
                    deps.forEach(dep => {
                        let pathAry = pathMap?.get(dep);
                        if (!pathAry)
                            return;
                        subChain = concat(pathAry, [prop]);
                        reactiveVal = reactive(value, dep);
                        PROXY_MAP.set(value, reactiveVal);
                        if (!OBJECT_VAR_PATH.has(reactiveVal))
                            OBJECT_VAR_PATH.set(reactiveVal, subChain);
                    });
                }
                return reactiveVal;
            },
            set(target, prop, newValue, receiver) {
                if (!prop)
                    return false;
                let ov = target[prop];
                let chain = OBJECT_VAR_PATH.get(receiver) ?? [];
                let subChain = concat(chain, [prop]);
                let propDefs = get(context.constructor, DecoratorKey.PROPS);
                let stateDefs = get(context.constructor, DecoratorKey.STATES);
                let hasChanged = get(propDefs, [subChain[0], 'hasChanged']) || get(stateDefs, [subChain[0], 'hasChanged']);
                if (hasChanged) {
                    if (!hasChanged.call(context, newValue, ov))
                        return true;
                }
                else {
                    //默认对比算法
                    if (Object.is(ov, newValue)) {
                        return true;
                    }
                }
                if (propDefs && propDefs[prop] && target.__isData) {
                    if (propDefs[prop].sync) {
                        context.emit(EVENT_UPDATE + ":" + prop, { value: newValue });
                    }
                }
                //get oldValue from sourceContext
                let nv = newValue;
                let rs = Reflect.set(target, prop, nv);
                notifyUpdate(context, ov, subChain);
                return rs;
            }
        });
        let chain = OBJECT_VAR_PATH.get(obj) ?? [];
        if (Object.isExtensible(obj) && !OBJECT_META_DATA.get(proxyObject)) {
            let contextSet = new Set();
            contextSet.add(context);
            //对象所属context
            let pathMap = new WeakMap();
            pathMap.set(context, chain);
            OBJECT_META_DATA.set(proxyObject, {
                from: context,
                contextSet,
                pathMap
            });
        }
        else {
            let deps = OBJECT_META_DATA.get(proxyObject).contextSet;
            deps.add(context);
            let pathMap = OBJECT_META_DATA.get(proxyObject).pathMap;
            let chains = pathMap.get(context);
            let subChain = concat(chain);
            if (chains && chains.join('') !== subChain.join('')) {
                let parentVar = get(context, initial(chains));
                //处理数组元素更新，如 ary.1 -> ary.0
                if (!isArray(parentVar)) {
                    showWarn(`The object is referenced by more than one @state '${subChain.join('.')},${chains.join('.')}'`);
                }
                chains = subChain;
            }
            else {
                pathMap.set(context, subChain);
            }
        }
        PROXY_MAP.set(obj, proxyObject);
        return proxyObject;
    }
    function notifyUpdate(context, ov, path) {
        //computed
        let computedMap = COMPUTED_MAP.get(context);
        //css
        let cssMap = CSS_MAP.get(context);
        //watch
        let watchMap = WATCH_MAP.get(context);
        //recur path
        if (computedMap || cssMap || watchMap) {
            let i = path.length;
            while (i) {
                let subPath = path.slice(0, i).join(PATH_SEPARATOR);
                if (watchMap) {
                    const watchList = watchMap[subPath];
                    if (i === path.length) {
                        watchList?.forEach((wk) => {
                            let updater = wk();
                            updater.ov = ov;
                            Queue.pushWatch(updater);
                        });
                    }
                    else {
                        watchList?.forEach((wk) => {
                            let updater = wk();
                            if (get(updater, 'deep')) {
                                updater.ov = ov;
                                Queue.pushWatch(updater);
                            }
                        });
                    }
                }
                if (computedMap) {
                    let computedList = computedMap[subPath];
                    if (!isEmpty(computedList)) {
                        for (let l = 0; l < computedList.length; l++) {
                            const updater = computedList[l];
                            Queue.pushComputed(updater);
                        }
                    }
                }
                if (cssMap) {
                    let computedCssList = cssMap[subPath];
                    if (!isEmpty(computedCssList)) {
                        for (let l = 0; l < computedCssList.length; l++) {
                            const updater = computedCssList[l];
                            Queue.pushCss(updater);
                        }
                    }
                }
                i--;
            }
        }
        let updater = context._notify(ov, path);
        Queue.pushNext(updater, context.cid);
    }
    const QMap = new Map();
    class Queue {
        static watchSet = new Set();
        static computedSet = new Set();
        static cssSet = new Set();
        static nextSet = new Set();
        static nextPending = false;
        static next;
        static flush() {
            Queue.nextPending = false;
            let wq = Array.from(Queue.watchSet);
            Queue.watchSet.clear();
            let cq = Array.from(Queue.computedSet);
            Queue.computedSet.clear();
            let sq = Array.from(Queue.cssSet);
            Queue.cssSet.clear();
            let nq = Array.from(Queue.nextSet);
            Queue.nextSet.clear();
            wq.forEach(u => u(get(u, 'ov')));
            cq.forEach(u => u());
            sq.forEach(u => u());
            nq.forEach(u => u());
            QMap.clear();
        }
        static pushWatch(updater) {
            Queue.watchSet.add(updater);
        }
        static pushComputed(updater) {
            Queue.computedSet.add(updater);
        }
        static pushCss(updater) {
            Queue.cssSet.add(updater);
        }
        static pushNext(updater, key) {
            if (key) {
                if (QMap.has(key)) {
                    // console.log(updater, 'nextting......')
                    return;
                }
                QMap.set(key, updater);
            }
            Queue.nextSet.add(updater);
            if (!Queue.nextPending) {
                Queue.nextPending = true;
                Queue.next();
            }
        }
    }
    (() => {
        const p = Promise.resolve();
        const nextFn = Queue.flush;
        Queue.next = () => {
            p.then(nextFn);
        };
    })();

    const PropTypeMap = {
        boolean: Boolean,
        string: String,
        number: Number,
        object: Object,
        array: Array,
        function: Function,
        undefined: Object
    };
    //组件静态样式
    const ComponentStyleMap = new WeakMap();
    let DefaultCss = [];
    let CompElemSn = 0;
    const GlobalStyleMap = new Map();
    const HostStyleMap = new WeakMap();
    const PROP_OBJECT_KEY_MAP_SYMBOL = Symbol.for('PROP_OBJECT_KEY_MAP_SYMBOL');
    /**
     * CompElem基类，意为组件元素。提供了基本内置属性及生命周期等必备接口
     * 每个组件都需要继承自该类
     *
     * @author holyhigh2
     */
    class CompElem extends HTMLElement {
        static __l_globalRule = document.createElement("style");
        //设置全局/组件默认属性
        static defaults(options) {
            DefaultCss = flatMap(options.css, c => {
                if (isString(c)) {
                    let sheet = new CSSStyleSheet();
                    sheet.replaceSync(c);
                    return sheet;
                }
                else if (c instanceof CSSStyleSheet) {
                    return c;
                }
                return [];
            });
            //todo...
            options.global;
            each(options, (v, k) => {
                if (test(k[0], /[A-Z]/));
            });
        }
        #cid;
        #slotPropsMap = {};
        #data = { '#slots': {} };
        #reactiveData = {};
        #updateSources = {};
        #shadow;
        //保存所有渲染上下文 {CompElem/Directive}
        #renderContextList = {};
        __events = {};
        _propObjectKeyMap = {};
        get [PROP_OBJECT_KEY_MAP_SYMBOL]() {
            return this._propObjectKeyMap;
        }
        get [Symbol.toStringTag]() {
            return this.constructor.name;
        }
        get cid() {
            return this.#cid;
        }
        get reactiveData() {
            return this.#reactiveData;
        }
        get attrs() {
            return this.#attrs;
        }
        get props() {
            return this.#props;
        }
        get renderRoot() {
            return this.#renderRoot;
        }
        get renderRoots() {
            return this.#renderRoots;
        }
        get parentComponent() {
            return this.#parentComponent;
        }
        get wrapperComponent() {
            return this.#wrapperComponent;
        }
        get slotHooks() {
            return this.#slotHooks;
        }
        get css() {
            return ComponentStyleMap.get(this.constructor);
        }
        get globalStyleSheet() {
            return GlobalStyleMap.get(this.constructor)?.sheet;
        }
        get isMounted() {
            return this.#mounted;
        }
        //slots列表中绝对不会出现slot元素
        get slots() {
            return this.#data['#slots'];
        }
        #attrs;
        #props;
        #renderRoot;
        #renderRoots;
        #parentComponent;
        #wrapperComponent;
        #slotsEl = {};
        #slotHooks = {};
        #slotNodes = {};
        #mounted = false;
        //////////////////////////////////// styles
        /**
         * 组件样式，CSSStyleSheet可动态变更
         */
        static get styles() {
            return [];
        }
        static get globalStyles() {
            return [];
        }
        static get hostStyles() {
            return [];
        }
        get styles() {
            return [];
        }
        #inited = false;
        #initiating = false;
        constructor(...args) {
            super();
            this.#cid = CompElemSn++;
            //init props via constructor
            if (size(args) === 1) {
                this.#props = {};
                assign(this.#props, first(args));
            }
            let render = this.render.bind(this);
            this.render = function () {
                let rs;
                Collector.startRender(this);
                rs = render();
                Collector.endRender(this);
                return rs;
            };
            /////////////////////////////////////////////////// styles
            //global styles
            let globalStyles = get(this.constructor, "globalStyles");
            // let beAttached = get(this.constructor, '_global_style_attached')
            let beAttached = GlobalStyleMap.has(this.constructor);
            if (!isEmpty(globalStyles) && !beAttached) {
                let globalTextContent = "";
                globalStyles.forEach((st) => {
                    if (isString(st)) {
                        globalTextContent += st + "\n";
                    }
                });
                let style = document.createElement('style');
                style.textContent += globalTextContent;
                GlobalStyleMap.set(this.constructor, style);
                document.head.appendChild(style);
                // set(this.constructor, '_global_style_attached', '1')
            }
            //component styles
            let beAttached2 = ComponentStyleMap.get(this.constructor);
            let styleSheets = beAttached2 ?? [];
            if (!beAttached2) {
                each(get(this.constructor, "styles"), (st) => {
                    if (isString(st)) {
                        let sheet = new CSSStyleSheet();
                        sheet.replaceSync(st);
                        styleSheets.push(sheet);
                    }
                    else {
                        styleSheets.push(st);
                    }
                });
                ComponentStyleMap.set(this.constructor, styleSheets);
            }
            /////////////////////////////////////////////////// shadow
            this.#shadow = this.attachShadow({
                mode: "open"
            });
            this.#shadow.adoptedStyleSheets = [...DefaultCss, ...styleSheets];
            /////////////////////////////////////////////////// slots
            this.#updateSlotsAry();
            //slots prop map
            // this._slotsPropMap = { default: [] }
            /////////////////////////////////////////////////// decorators create
            let ary = get(this.constructor, _DecoratorsKey);
            ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => dw.create(this));
            this.#updatedD = this.#update.bind(this);
        }
        /**
         * Returns the root component in the parent chain, or itself if it's the top-level component.
         */
        get rootComponent() {
            let comp = this;
            while (comp.parentComponent) {
                comp = comp.parentComponent;
            }
            return comp;
        }
        #updatedD;
        connectedCallback() {
            //parent
            let node = closest(this.parentNode, (node) => node instanceof CompElem || node.host instanceof CompElem, "parentNode");
            this.#parentComponent = node
                ? node instanceof CompElem
                    ? node
                    : node.host
                : null;
            this.__init();
        }
        disconnectedCallback() {
        }
        //////////////////////////////////// lifecycles
        //********************************** 首次渲染
        //构造时上级传递的参数
        __init() {
            if (this.#inited)
                return;
            //防止在钩子中出现重新挂载的情况
            if (this.#initiating)
                return;
            this.#initiating = true;
            /////////////////////////////////////////////////// slots
            this.#updateSlotsAry();
            //1. Props & States
            const props = this.#initProps();
            this.propsReady(props);
            for (const key in props) {
                const v = props[key];
                this.#data[key] = v;
            }
            this.#initStates();
            //2. Data
            each(this.#data, (v, k) => {
                let descr = Reflect.getOwnPropertyDescriptor(this.#data, k);
                Reflect.defineProperty(this, k, {
                    get() {
                        let v = Reflect.get(this.#reactiveData, k);
                        return descr?.get ? descr?.get() : v;
                    },
                    set(v) {
                        if (descr?.set) {
                            descr?.set(v);
                        }
                        else {
                            Reflect.set(this.#reactiveData, k, v);
                        }
                    },
                });
            });
            Reflect.defineProperty(this.#data, '__isData', {
                enumerable: false,
                value: true
            });
            this.#reactiveData = reactive(this.#data, this);
            //3. Computed
            let computedMap = get(this.constructor, DecoratorKey.COMPUTED);
            each(computedMap, (getter, propKey) => {
                Collector.startCollect(this, CollectorType.COMPUTED);
                Collector.setUpdater(() => {
                    this.#reactiveData[propKey] = getter.call(this);
                });
                this.#data[propKey] = getter.call(this);
                Collector.endCollect();
                Reflect.defineProperty(this, propKey, {
                    get() {
                        return Reflect.get(this.#reactiveData, propKey);
                    },
                    set(v) {
                        showTagError(this.tagName, "Cannot set a computed property '" + propKey + "'");
                    },
                });
            });
            //4. Watch
            let watchMap = get(this.constructor, DecoratorKey.WATCH);
            each(watchMap, (watchList, k) => {
                watchList.forEach(v => {
                    let { source, options, handler } = v;
                    let fn = handler.bind(this);
                    let onceWatch = get(options, "once", false);
                    if (onceWatch) {
                        fn = once(fn);
                    }
                    const updater = (function (ov) {
                        let nv = get(this, source.replaceAll(PATH_SEPARATOR, '.'));
                        fn(nv, ov, source);
                    }).bind(this);
                    let deep = get(options, "deep", false);
                    updater.deep = deep;
                    Collector.collectWatch(this, () => updater, k);
                    let immediate = get(options, "immediate", false);
                    if (!immediate)
                        return;
                    let nv = get(this, source.replaceAll(PATH_SEPARATOR, '.'));
                    fn(nv, nv, source);
                });
            });
            //5. Render
            let tmpl = this.render();
            let nodes = buildView(tmpl, this);
            if (nodes) {
                this.#shadow.append(...nodes);
                this.#renderRoots = filter(this.#shadow.childNodes, (n) => n.nodeType === Node.ELEMENT_NODE);
                this.#renderRoot = this.#renderRoots[0];
            }
            /////////////////////////////////////////////////// before mount
            //slot hook
            each(this.#slotHooks, (v, k) => {
                this.#updateSlot(k);
            });
            const that = this;
            let ary = get(this.constructor, _DecoratorsKey);
            ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
                dw.beforeMount(this, (key, value) => {
                    that.#reactiveData[key] = value;
                    return that.#reactiveData[key];
                });
            });
            //host styles
            let hostStyles = get(this.constructor, "hostStyles");
            let styleRoot = this.#wrapperComponent?.shadowRoot ?? this.ownerDocument;
            let cls = HostStyleMap.get(styleRoot);
            if (!cls?.includes(this.constructor) && hostStyles.length > 0) {
                let styleSheets = [];
                each(hostStyles, (st) => {
                    if (isString(st)) {
                        let sheet = new CSSStyleSheet();
                        sheet.replaceSync(st);
                        styleSheets.push(sheet);
                    }
                    else {
                        styleSheets.push(st);
                    }
                });
                styleRoot.adoptedStyleSheets = [...styleRoot.adoptedStyleSheets, ...styleSheets];
                cls?.push(this.constructor);
            }
            this.beforeMount();
            //events
            let eventList = get(this.constructor, DecoratorKey.EVENTS);
            eventList && eventList.forEach(async (ev) => {
                let name = ev.name;
                let options = assign({ target: document, once: false, passive: false, capture: false }, ev.options);
                let listener = bind(ev.fn, this);
                let target = options.target;
                if (isFunction(target)) {
                    target = await target.call(this, this);
                }
                if (!target) {
                    showTagError(this.tagName, "The target of @event('" + name + "',...) is invalid");
                    return;
                }
                target.addEventListener(name, listener, options);
            });
            //instance dynamic style
            Collector.startCollect(this, CollectorType.CSS);
            let cssAry = [];
            this.styles.forEach(st => {
                if (!isFunction(st))
                    return;
                let cssss = new CSSStyleSheet();
                cssAry.push(cssss);
                Collector.setUpdater(() => {
                    let css = st() ?? '';
                    cssss.replaceSync(css);
                });
                let css = st();
                if (isBlank(css))
                    return;
                cssss.replaceSync(css);
            });
            Collector.endCollect();
            if (cssAry.length > 0) {
                this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, ...cssAry];
            }
            setTimeout(() => {
                this.#mounted = true;
                this.mounted();
                ary && ary.forEach(dw => {
                    dw.mounted(this, (key, value) => {
                        that.#reactiveData[key] = value;
                        return that.#reactiveData[key];
                    });
                });
            }, 0);
            this.#inited = true;
        }
        propsReady(props) { }
        render() {
            throw Error(`[CompElem <${this.tagName}>] Missing render()`);
        }
        beforeMount() { }
        mounted() { }
        #onSlotChange(slot, name) {
            //1. 更新 _slotsPropMap & slots
            this.#updateSlotsAry();
            //2. 设置attrs
            let props = get(this.#slotPropsMap[name], 'props');
            if (props) {
                each(this.slots, (nodeAry, k) => {
                    nodeAry.filter(node => node.nodeType === Node.ELEMENT_NODE).forEach((node) => {
                        if (node instanceof CompElem) {
                            // node._setParentProps(props)
                            node._updateProps(props);
                            return;
                        }
                        each(props, (v, k) => {
                            if (node instanceof HTMLSlotElement) {
                                let compOfSlot = get(node, '__l_comp');
                                if (compOfSlot) {
                                    let sname = node.name || 'default';
                                    let slotMap = compOfSlot.#slotPropsMap[sname];
                                    if (!slotMap) {
                                        slotMap = compOfSlot.#slotPropsMap[sname] = { props: {} };
                                    }
                                    if (!slotMap.props) {
                                        slotMap.props = {};
                                    }
                                    slotMap.props[k] = v;
                                    compOfSlot.#onSlotChange(node, sname);
                                }
                            }
                            else {
                                node.setAttribute(k, v);
                            }
                        });
                    });
                });
            }
            //3. callback
            this.slotChange(slot, name);
        }
        slotChange(slot, name) { }
        attributeChangedCallback(attributeName, oldValue, newValue) {
            this.#attrChanged(attributeName, oldValue, newValue);
        }
        //********************************** 更新
        /**
         * 是否需要更新，可获取变更属性
         * 返回true时更新
         */
        shouldUpdate(changed) {
            return true;
        }
        /**
         * 1. 调用render
         * 2. 更新@query/all
         * 3. 更新ref
         * 4. 更新prop到attr的映射
         * @param changed
         */
        updated(changed) { }
        #rootEvs = {};
        /**
         * 由监控变量调用
         * @param stateKey
         * @param ov
         * @param rootStateKey 如果是对象内部属性变更，会返回根属性名
         * @returns
         */
        _notify(ov, chain) {
            //todo  1. 取消data - 0这个层级的监控；需要验证删除行时的路径
            let varPath = [];
            for (let i = 0; i < chain.length; i++) {
                const seg = chain[i];
                varPath.push(seg);
                let v = get(this, varPath);
                let pathStr = _toUpdatePath(varPath);
                this.#updateSources[pathStr] = { value: v, chain: pathStr === "slots" ? ['slots'] : varPath, oldValue: ov, end: varPath.length === chain.length };
            }
            return this.#updatedD;
        }
        #update() {
            if (size(this.#updateSources) < 1)
                return;
            const changed = this.#updateSources;
            this.#updateSources = {};
            const changedKeys = Object.keys(changed);
            //update decorators
            let ary = get(this.constructor, _DecoratorsKey);
            ary && ary.sort((a, b) => b.priority - a.priority).forEach(dw => {
                dw.updated(this, changed);
            });
            let toBreak = !this.shouldUpdate(changed);
            if (toBreak)
                return;
            let renderContextList = new Set();
            //1. filter context
            each(changed, ({ value, chain, oldValue, end }, k) => {
                if (this.#renderContextList[k]) {
                    this.#renderContextList[k].forEach(cx => {
                        renderContextList.add(cx);
                    });
                }
            });
            //2. update context
            renderContextList.forEach(context => {
                if (context === this) {
                    updateView(this.render(), this, undefined, changedKeys);
                }
                else {
                    //指令在这里仅更新视图
                    updateDirectiveView(context, this);
                }
            });
            //update slot view
            this.#updateSlots.forEach((v) => {
                this.#updateSlot(v);
            });
            this.updated(changed);
        }
        /**
         * 1. 初始props中并未包含的属性，可从attributes取，且定义类型不是string时自动转换
         * 2. 如果attributes中也未出现且必填报错
         * 3. 否则设置默认值
         * @returns 非props的attr集合
         */
        #initProps() {
            let propDefs = get(this.constructor, DecoratorKey.PROPS);
            let attrs = this.attributes;
            let tagName = this.tagName;
            let parentProps = this.#props;
            let filterAttrs = {};
            each(attrs, ({ name, value }) => {
                if (name[0] === ATTR_PREFIX_EVENT ||
                    name[0] === ATTR_PREFIX_PROP ||
                    name[0] === ATTR_PREFIX_BOOLEAN ||
                    name === ATTR_REF || name === 'slot')
                    return;
                let camelName = camelCase(name);
                if (propDefs && !propDefs[camelName]) {
                    filterAttrs[name] = value;
                }
            });
            this.#attrs = this.#attrs ? assign(this.#attrs, filterAttrs) : filterAttrs;
            let rs = {};
            if (!propDefs)
                return Object.seal(rs);
            let keys = Object.keys(propDefs);
            let size = keys.length;
            for (let i = 0; i < size; i++) {
                const key = keys[i];
                const kbKey = kebabCase(key);
                const hasAttr = this.hasAttribute(kbKey);
                let propDef = propDefs[key];
                let isInited = has(parentProps, key);
                let defaultVal = get(this, key);
                if (!('_defaultValue' in propDef)) {
                    //在构造结束后
                    propDef._defaultValue = defaultVal;
                    if (!propDef.type) {
                        if (isUndefined(defaultVal)) {
                            showTagError(tagName, "Prop '" + key + "' has neither propType nor defaultValue be used for type inference");
                        }
                        let type = typeof defaultVal;
                        if (isArray(defaultVal))
                            type = 'array';
                        let inferredType = PropTypeMap[type];
                        propDef.type = inferredType;
                    }
                }
                let val = undefined;
                if (isInited) {
                    val = isNil(parentProps[key]) ? defaultVal : parentProps[key];
                }
                else {
                    val = defaultVal;
                    let attr = attrs.getNamedItem(kbKey) ||
                        attrs.getNamedItem(ATTR_PREFIX_PROP + kbKey);
                    if (attr) {
                        isInited = true;
                        val = attr.value;
                    }
                }
                //required check
                let isRequired = propDef.required;
                if (isRequired && !isInited) {
                    showTagError(tagName, "Prop '" + key + "' is required");
                    break;
                }
                val = this.#propTypeCheck(propDefs, key, val, hasAttr);
                let getter = get(propDefs, [key, 'getter']);
                if (getter)
                    getter = bind(getter, this);
                let setter = get(propDefs, [key, 'setter']);
                if (setter)
                    setter = bind(setter, this);
                if (getter || setter) {
                    Reflect.defineProperty(this.#data, key, {
                        set: setter || function (v) { },
                        get: getter
                    });
                }
                if (propDef.attribute && isDefined(val) && !isObject(val)) {
                    let k = kebabCase(key);
                    let v = trim(val);
                    if (isBooleanProp(propDef.type)) {
                        v = getBooleanValue(val);
                        if (isBoolean(v)) {
                            this.toggleAttribute(k, v);
                        }
                        else {
                            this.setAttribute(k, v);
                        }
                    }
                    else {
                        this.setAttribute(k, v);
                    }
                }
                this.#data[key] = val;
                rs[key] = val;
            }
            return Object.seal(rs);
        }
        #convertValue(v, types) {
            let val = v;
            try {
                for (let i = 0; i < types.length; i++) {
                    const t = types[i];
                    if (t === Boolean) {
                        val = getBooleanValue(v);
                    }
                    else if (t === Number) {
                        val = Number(v);
                    }
                    else if (t === String) {
                        val = String(v);
                    }
                    else if (t === Object || t === Array) {
                        val = parseJSON(v);
                    }
                    else if (t === Date) {
                        val = new Date(v);
                    }
                    else {
                        val = new t(v);
                    }
                }
            }
            catch (error) {
                showTagError(this.tagName, `Convert attribute error with ` + v);
            }
            return val;
        }
        //属性值检测
        #propTypeCheck(propDefs, propKey, newValue, hasAttr) {
            let propDef = propDefs[propKey];
            if (!propDef)
                return newValue;
            let validator = propDef.isValid;
            let expectType = propDef.type;
            let expectTypeAry = isArray(expectType) ? expectType : [expectType];
            let typeConverter = propDef.converter;
            let val = newValue;
            if (!some(expectTypeAry, (et) => et === String) && isString(val) && !isNull(val)) {
                try {
                    val = typeConverter ? typeConverter(val) : this.#convertValue(val, expectTypeAry);
                }
                catch (error) {
                    showTagError(this.tagName, `Convert attribute '${propKey}' error with ` + val);
                }
            } //endif
            //extra work
            for (let i = 0; i < expectTypeAry.length; i++) {
                const et = expectTypeAry[i];
                if (et.name === 'Boolean') {
                    val = hasAttr === false && isBlank(val) ? false : getBooleanValue(val);
                }
            }
            if (isNil(val)) {
                return val;
            }
            let realType = typeof val;
            let matched = isDefined(val) ? false : true;
            for (let i = 0; i < expectTypeAry.length; i++) {
                const et = expectTypeAry[i];
                if (
                    //base form
                    test(realType, et.name, "i") ||
                    //object form
                    val instanceof et || (Object.prototype.toString.call(val) === Object.prototype.toString.call(et.prototype))) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                showTagError(this.tagName, `Invalid prop '${propKey}'. expected '${expectTypeAry.map((t) => t.name || t)}' but got '${realType}'`);
            }
            if (validator) {
                if (!validator.call(this, val, this.#data)) {
                    showTagError(this.tagName, `Invalid prop '${propKey}'. IsValid() check failed`);
                }
            }
            return val;
        }
        #initStates() {
            let stateDefs = get(this.constructor, DecoratorKey.STATES);
            each(stateDefs, (def, key) => {
                let stateDef = stateDefs[key];
                let val = get(this, key);
                if (stateDef) {
                    let propName = stateDef.prop;
                    val = propName ? cloneDeep(this.#data[propName]) : get(this, key);
                }
                this.#data[key] = val;
            });
        }
        /**
         * 由外部调用，在初始化及更新时。
         * @param props
         * @param attrs
         */
        #propsReady = debounce(this.propsReady, 100);
        /**
         * @deprecated
         */
        _setParentProps(props, attrs) {
            if (this.#inited) {
                let propDefs = get(this.constructor, DecoratorKey.PROPS);
                //存在attrs表示已初始化完成
                each(props, (v, k) => {
                    let ck = camelCase(k);
                    let propDef = propDefs[ck];
                    if (!propDef)
                        return;
                    let ov = this.#data[ck];
                    v = this.#propTypeCheck(propDefs, ck, v);
                    if (propDef.hasChanged && !propDef.hasChanged.call(this, v, ov))
                        return;
                    this.#data[ck] = v;
                    this._notify(ov, [ck]);
                });
                assign(this.#props, props);
                assign(this.#attrs, attrs);
                this.#propsReady(this.#props);
            }
        }
        //todo 这里需要直接修改prop
        _updateProps(props) {
            let propDefs = get(this.constructor, DecoratorKey.PROPS);
            //存在attrs表示已初始化完成
            each(props, (v, k) => {
                let ck = camelCase(k);
                let propDef = propDefs[ck];
                if (!propDef)
                    return;
                v = this.#propTypeCheck(propDefs, ck, v);
                Collector.__skipCheck = true;
                set(this, ck, v);
                Collector.__skipCheck = false;
            });
            assign(this.#props, props);
            this.#propsReady(this.#props);
        }
        _initProps(props, attrs) {
            this.#props = merge(this.#props || {}, props);
            this.#attrs = merge(this.#attrs || {}, attrs);
        }
        /**
         * 绑定slot标签，render时调用
         */
        _bindSlot(slot, name, props) {
            //1. 设置map
            if (!this.#slotsEl[name]) {
                this.#slotsEl[name] = slot;
                Reflect.defineProperty(slot, '__l_comp', {
                    value: this
                });
            }
            slot.addEventListener('slotchange', (e) => {
                if (this.#inited)
                    this.#onSlotChange(slot, name === 'default' ? '' : name);
            });
            //3. 保存参数
            if (!isEmpty(props)) {
                let slotMap = this.#slotPropsMap[name];
                if (!slotMap) {
                    slotMap = this.#slotPropsMap[name] = {};
                }
                slotMap.props = props;
            }
        }
        _bindSlotHook(name, hook) {
            this.#slotHooks[name] = hook;
        }
        //slot变量变动时触发
        #updateSlots = new Set();
        _updateSlot(name, propName, value) {
            let slotEl = this.#slotsEl[name];
            let hook = this.#slotHooks[name];
            if (!hook && !slotEl)
                return;
            let slotMap = this.#slotPropsMap[name];
            if (propName) {
                if (!slotMap.props) {
                    slotMap.props = {};
                }
                slotMap.props[propName] = value;
            }
            if (!!hook) {
                this.#updateSlots.add(name);
            }
            else {
                //update nodes
                let els = slotEl.assignedElements({ flatten: true });
                for (let i = 0; i < els.length; i++) {
                    const el = els[i];
                    el.setAttribute(propName, value + '');
                }
            }
        }
        #updateSlotsAry() {
            const cs = flatMap(this.childNodes, node => {
                if (node.nodeType === Node.COMMENT_NODE)
                    return [];
                if (node instanceof HTMLSlotElement)
                    return node.assignedNodes({ flatten: true });
                return node;
            });
            let groups = groupBy(cs, node => {
                if (node.nodeType === Node.TEXT_NODE)
                    return 'default';
                if (node instanceof Element) {
                    return node.getAttribute('slot') || 'default';
                }
            });
            if (isEmpty(groups)) {
                if (!isEmpty(this.#data['#slots'])) {
                    this.#inited ? this.#reactiveData['#slots'] = {} : this.#data['#slots'] = {};
                }
                return;
            }
            each(groups, (nodeAry, k) => {
                if (!k)
                    return;
                while (nodeAry.length > 0) {
                    let node = nodeAry[0];
                    if ((node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) ||
                        (node instanceof HTMLSlotElement && isEmpty(node.assignedNodes({ flatten: true })))) {
                        nodeAry.shift();
                        continue;
                    }
                    break;
                }
                while (nodeAry.length > 0) {
                    let node = last(nodeAry);
                    if ((node.nodeType === Node.TEXT_NODE && isBlank(node.textContent)) ||
                        (node instanceof HTMLSlotElement && isEmpty(node.assignedNodes({ flatten: true })))) {
                        nodeAry.pop();
                        continue;
                    }
                    break;
                }
            });
            let rs = {};
            each(groups, (v, k) => {
                if (!isEmpty(v)) {
                    rs[k] = v;
                }
            });
            this.#inited ? this.#reactiveData['#slots'] = rs : this.#data['#slots'] = rs;
        }
        #updateSlot(name) {
            let hook = this.#slotHooks[name];
            if (!hook)
                return;
            let slotMap = this.#slotPropsMap[name];
            let slot = this.#data['#slots'][name];
            //slot not ready yet
            //1. 可能是if/each等指令还未插入
            if (!slot)
                return;
            //组件通知渲染异步指令
            this.renderAsync(hook, get(slotMap, 'props'));
            const rc = this._asyncDirectives.get(hook);
            //todo 如果要做成通用异步指令，元素必须插入到指令挂载的位置，并且slot的插入节点还要去掉注释
            let nodes = rc?.buildView(hook(get(slotMap, 'props')));
            let nnodes = reject(toArray(nodes), n => n.nodeType === Node.COMMENT_NODE);
            if (nnodes) {
                let slottedNodes = this.#slotNodes[name];
                if (!isEmpty(slottedNodes)) {
                    for (let i = 0; i < slottedNodes.length; i++) {
                        const n = slottedNodes[i];
                        n.parentNode?.removeChild(n);
                    }
                }
                this.#slotNodes[name] = nnodes;
                this.append(...nnodes);
                this.#updateSlots.clear();
            }
        }
        _asyncDirectives = new WeakMap();
        renderAsync(cbk, ...args) {
        }
        #attrChanged(name, oldValue, newValue) {
            if (!this.#inited)
                return;
            let observedAttrs = _getObservedAttrs(this.constructor);
            if (observedAttrs.has(name)) {
                let camelName = camelCase(name);
                if (isNull(newValue)) {
                    let propDefs = get(this.constructor, DecoratorKey.PROPS);
                    //使用默认值
                    newValue = propDefs[camelName]._defaultValue;
                }
                this._updateProps({ [camelName]: newValue });
            }
        }
        /**
         * todo
         * 1. 取消上溯递归路径
         */
        _regDeps(varPath, renderContext) {
            let list = this.#renderContextList[varPath];
            if (!list) {
                list = this.#renderContextList[varPath] = new Set();
            }
            list.add(renderContext);
            let restPath = varPath.split(PATH_SEPARATOR);
            restPath.pop();
            if (restPath.length < 1)
                return;
            let upperPath = restPath.join(PATH_SEPARATOR);
            list = this.#renderContextList[upperPath];
            if (!list) {
                list = this.#renderContextList[upperPath] = new Set();
            }
            list.add(renderContext);
        }
        _regWrapper(wrapperComponent) {
            this.#wrapperComponent = wrapperComponent;
        }
        ////////////////////----------------------------/////////////// APIs
        /**
         * 抛出自定义事件
         * @param evName 事件名称
         * @param args 自定义参数
         */
        emit(evName, arg = {}, options) {
            if (options && options.event) {
                arg.event = options.event;
            }
            arg.target = this;
            this.dispatchEvent(new CustomEvent(evName, {
                bubbles: get(options, "bubbles", false),
                composed: get(options, "composed", false),
                cancelable: true,
                detail: arg,
            }));
        }
        /**
         * 在root上绑定事件
         * @param evName
         * @param hook
         */
        on(evName, hook) {
            if (!this.#rootEvs[evName]) {
                this.#rootEvs[evName] = [];
            }
            let cbk = hook.bind(this);
            this.#rootEvs[evName].push(cbk);
            this.addEventListener(evName, cbk);
        }
        /**
         * 下一帧执行
         * @param cbk
         */
        nextTick(cbk, key) {
            Queue.pushNext(cbk, key);
        }
        /**
         * 强制更新一次视图
         */
        forceUpdate() {
            each(this.#reactiveData, (v, k) => {
                this.#updateSources[k] = {
                    value: undefined,
                    chain: undefined,
                };
            });
            this.#update();
        }
    }

    /**
     * 交互点信息
     */
    class EnterPoint {
        startNode; //依赖节点
        endNode; //依赖节点2
        type; //依赖类型
        attrName; //依赖属性名
        varIndex;
        expressionChain; //所在层级序号 [parentVarIndex-varIndex-]+，如1-6 表示根的第2个表达式下的context的第7个表达式
        nodes; //如果是插入节点，保存插入的节点数组
        constructor(node, attrName, type) {
            this.startNode = node;
            this.attrName = attrName;
            this.type = type;
        }
        setVarIndex(varIndex) {
            this.varIndex = varIndex;
        }
        getNodes() {
            let nextNode = this.startNode.nextSibling;
            if (!this.endNode)
                return [nextNode];
            let rs = [];
            while (nextNode && nextNode !== this.endNode) {
                rs.push(nextNode);
                nextNode = nextNode?.nextSibling;
            }
            return rs;
        }
    }
    var MovePosition;
    (function (MovePosition) {
        MovePosition["AFTER_BEGIN"] = "afterbegin";
    })(MovePosition || (MovePosition = {}));
    const newNodeMap = {};
    function addNodes(adds, newTmpls, newSeq, component, updatePoints, pointNode) {
        const combStrings = [];
        const combVars = [];
        const ks = [];
        let addGroup = [];
        let lastKey;
        adds.forEach(add => {
            let lastAdd = last(addGroup);
            if (lastAdd) {
                if (lastKey === add.prevNode) {
                    if (!lastAdd.group) {
                        lastAdd.group = [lastKey];
                    }
                    lastAdd.group.push(add.newkey);
                }
                else {
                    addGroup.push(add);
                }
            }
            else {
                addGroup.push(add);
            }
            lastKey = add.newkey;
            let k = add.newkey;
            ks.push(k);
            combStrings.push('');
            combVars.push(newTmpls[k]);
        });
        combStrings.push('');
        let tmpl = new Template(combStrings, combVars);
        let originalUps = [...updatePoints];
        let nodes = buildDirectiveView(pointNode, tmpl, component); //this.di.buildView(tmpl)
        let ups = DirectiveUpdatePointsMap.get(pointNode);
        updatePoints.length = 0;
        updatePoints.push(...ups);
        let kMap = new Map();
        nodes.forEach((n) => {
            const k = n.getAttribute('key');
            if (ks.includes(k)) {
                kMap.set(k, true);
                newNodeMap[k] = n;
            }
        });
        originalUps.forEach((up, i) => {
            const k = up.key + '';
            if (!kMap.get(k) && newSeq.includes(k)) {
                updatePoints.push(up);
            }
        });
        return addGroup;
    }
    function updateDirective(point, newArgs, oldArgs, updater, renderComponent, slotComponent, varChain, isTextOrSlot = false) {
        let rs;
        if (isTextOrSlot) {
            Collector.startRender(point.endNode);
            rs = updater(point, newArgs, oldArgs, { renderComponent, slotComponent, varChain });
            Collector.endRender(renderComponent);
        }
        else {
            rs = updater(point, newArgs, oldArgs, { renderComponent, slotComponent, varChain });
        }
        if (!rs)
            return;
        let [tag, tmpl] = rs;
        if (tag === DirectiveUpdateTag.NONE)
            return;
        let nodes = point.getNodes();
        if (tag === DirectiveUpdateTag.REMOVE) {
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.parentNode?.removeChild(n);
            }
        }
        else if (tag === DirectiveUpdateTag.REPLACE) {
            let newNodes = [];
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.parentNode?.removeChild(n);
            }
            let nnodes = buildDirectiveView(point.endNode, tmpl, renderComponent);
            newNodes = toArray(nnodes);
            let fragment = document.createDocumentFragment();
            fragment.append(...newNodes);
            point.endNode.parentNode.insertBefore(fragment, point.endNode);
        }
        else if (tag === DirectiveUpdateTag.UPDATE) {
            let newKeys = {};
            let nodesToUpdate;
            //原节点顺序
            let oldSeq = [];
            let newSeq = [];
            let updatePoints = DirectiveUpdatePointsMap.get(point.endNode);
            if (!tmpl) {
                tmpl = new Template([], []);
            }
            if (isEmpty(nodes)) {
                let nodes = buildDirectiveView(point.endNode, tmpl, renderComponent);
                point.startNode.after(...nodes);
                return;
            }
            let newTmpls = {};
            if (tmpl instanceof Template) {
                tmpl.vars.forEach(v => {
                    if (v instanceof Template) {
                        const k = v.getKey();
                        newTmpls[k] = v;
                        newKeys[k] = true;
                        newSeq.push(k);
                    }
                });
            }
            //UPDATE仅处理元素节点
            nodes = filter(compact(nodes), n => n.nodeType === Node.ELEMENT_NODE);
            nodesToUpdate = filter(compact(toArray(nodesToUpdate)), n => n.nodeType === Node.ELEMENT_NODE);
            let oldNodeMap = {};
            let dupKey = '';
            let keyQ = {};
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                let treeNode = node;
                let k = treeNode.getAttribute("key");
                if (!k)
                    continue;
                if (oldNodeMap[k]) {
                    dupKey = k;
                    break;
                }
                oldNodeMap[k] = treeNode;
                oldSeq.push(k);
                keyQ[k] = true;
            }
            if (dupKey) {
                showError(`${camelCase(point.endNode._diName)} - duplicate key '${dupKey}'`);
                return;
            }
            let updateQ = newKeys;
            const parentNode = point.startNode.parentNode;
            //compare
            let adds = [];
            let dels = [];
            //计算del
            each(keyQ, (v, k) => {
                if (!updateQ[k]) {
                    dels.push(k);
                    delete keyQ[k];
                    remove(oldSeq, x => x === k);
                }
            });
            //计算move
            let moved = false;
            if (!isEmpty(newSeq)) {
                let lastMoveIndex = -1;
                let lastGroup = [];
                let moveQueue = [];
                let edgeOffset = 0;
                let i = 0;
                for (; i < newSeq.length; i++) {
                    const nodeId = newSeq[i];
                    let oldI = oldSeq.findIndex(c => c === nodeId);
                    if (oldI < 0) {
                        let prevKey = newSeq[i - 1];
                        let prev = prevKey ? oldNodeMap[prevKey] || prevKey : point.startNode;
                        //add
                        adds.push({ prevNode: prev, newkey: nodeId });
                        edgeOffset++;
                        continue;
                    }
                    if (oldI > -1 && oldI !== (i - edgeOffset)) {
                        if (lastMoveIndex < 0 || Math.abs(lastMoveIndex - oldI) === 1) {
                            let lastEl = last(lastGroup);
                            lastGroup.push({ nodeId, targetId: i === 0 ? MovePosition.AFTER_BEGIN : (lastEl ? lastEl.nodeId : newSeq[i - 1]) });
                        }
                        else {
                            moveQueue.push({ moveGroup: lastGroup, moveIndex: i + lastGroup.length });
                            lastGroup = [];
                            lastGroup.push({ nodeId, targetId: newSeq[i - 1] });
                        }
                        lastMoveIndex = oldI;
                    }
                }
                if (lastGroup.length > 0) {
                    moveQueue.push({ moveGroup: lastGroup, moveIndex: i + lastGroup.length });
                }
                if (moveQueue.length > 0) {
                    moved = true;
                    let vals = moveQueue.sort((a, b) => a.moveGroup.length - b.moveGroup.length);
                    if (vals.length < 2) {
                        let { moveGroup } = vals[0];
                        if (moveGroup.length > 1) {
                            let lastTId = last(moveGroup).targetId;
                            if (moveGroup[moveGroup.length - 2].nodeId === lastTId) {
                                moveGroup = initial(moveGroup);
                            }
                        }
                        moveGroup.forEach(({ targetId, nodeId }) => {
                            let srcEl = oldNodeMap[nodeId];
                            let target;
                            if (targetId === MovePosition.AFTER_BEGIN) {
                                target = point.startNode;
                                target.after(srcEl);
                            }
                            else {
                                target = oldNodeMap[targetId];
                                target.after(srcEl);
                            }
                        });
                    }
                    else {
                        let lastGroupIndex = last(vals).moveIndex;
                        if (Math.abs(vals[vals.length - 2].moveIndex - lastGroupIndex) === 1) {
                            vals = initial(vals);
                        }
                        vals.forEach(({ moveGroup }) => {
                            moveGroup.forEach(({ targetId, nodeId }) => {
                                let srcEl = oldNodeMap[nodeId];
                                let target;
                                if (targetId === MovePosition.AFTER_BEGIN) {
                                    target = point.startNode;
                                    target.after(srcEl);
                                }
                                else {
                                    target = oldNodeMap[targetId];
                                    target.after(srcEl);
                                }
                            });
                        });
                    }
                } //endif
            }
            let addGroup;
            if (adds.length > 0) {
                addGroup = addNodes(adds, newTmpls, newSeq, renderComponent, updatePoints, point.endNode);
                addGroup.forEach((v, i) => {
                    let k = v.newkey;
                    let treeNode = newNodeMap[k];
                    let prevNode = v.prevNode;
                    if (v.group) {
                        let fragment = document.createDocumentFragment();
                        fragment.append(...map(v.group, (nk) => newNodeMap[nk]));
                        treeNode = fragment;
                    }
                    if (prevNode === point.endNode) {
                        prevNode.before(treeNode);
                    }
                    else if (prevNode === point.startNode) {
                        prevNode.after(treeNode);
                    }
                    else if (typeof prevNode === 'string') {
                        newNodeMap[prevNode].after(treeNode);
                    }
                    else {
                        prevNode.after(treeNode);
                    }
                });
            }
            dels.forEach(k => {
                let treeNode = oldNodeMap[k];
                if (treeNode && treeNode.parentNode) {
                    parentNode.removeChild(treeNode);
                }
            });
            //合并
            if (tmpl.vars[0] instanceof Template) {
                let tStrAry = [];
                let tVarAry = [];
                each(tmpl.vars, v => {
                    tVarAry.push(...v.vars);
                    tStrAry.push(...map(v.vars, v => '1'));
                });
                tStrAry.push('1');
                tmpl = new Template(tStrAry, tVarAry);
            }
            //移动顺序
            if (moved || dels.length > 0 || addGroup) {
                const upGroup = groupBy(updatePoints, up => up.key);
                let movedUpAry = [];
                let i = 0;
                newSeq.forEach(nk => {
                    upGroup[nk].forEach((up) => {
                        up.varIndex = i++;
                        movedUpAry.push(up);
                    });
                });
                updatePoints = movedUpAry;
            }
            updateDirectiveView(point.endNode, renderComponent, tmpl, updatePoints);
        }
    }
    let DiSn = 0;
    /**
     * 返回指令调用函数
     * @param di
     * @returns
     */
    function directive(fn, scopes) {
        let name = fn.name || ('Di-' + DiSn++);
        let sym = Symbol.for(name);
        return (...args) => {
            let executor = fn(...args);
            return [sym, args, executor, (scopeType) => {
                if (!isEmpty(scopes) && !test(scopes.join(','), scopeType)) {
                    showError(`Directive '${Symbol.keyFor(sym)}' is out of scopes, expect '${scopes.join(',')}' bug got '${scopeType}'`);
                    return;
                }
            }, Collector.popDirectiveQ()];
        };
    }

    /*************************************************************
     * 扩展事件
     * @author holyhigh2
     *
     * resize
     * outside[.mousedown/mouseup/click/dblclick] 默认click
     * mutate[.attr/child/char/tree]
     *
     *************************************************************/
    const ExtEvNames = ['resize', 'outside', 'mutate'];
    ///////////////////////////////////////////////// resize
    const AllResizeEls = new WeakMap;
    const AllOutsideDownEls = [];
    const AllOutsideClickEls = [];
    const AllOutsideDblClickEls = [];
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const contentBoxSize = Array.isArray(entry.contentBoxSize)
                ? entry.contentBoxSize[0]
                : entry.contentBoxSize;
            const borderBoxSize = Array.isArray(entry.borderBoxSize)
                ? entry.borderBoxSize[0]
                : entry.borderBoxSize;
            let cbk = AllResizeEls.get(entry.target);
            if (cbk) {
                let ev = new CustomEvent('resize', {
                    bubbles: false,
                    cancelable: false,
                    detail: {
                        borderBox: { w: borderBoxSize.inlineSize, h: borderBoxSize.blockSize },
                        contentBox: { w: contentBoxSize.inlineSize, h: contentBoxSize.blockSize },
                    },
                });
                cbk(ev, entry.target);
            }
        }
    });
    function addResize(node, cbk) {
        if (AllResizeEls.has(node))
            return;
        AllResizeEls.set(node, cbk);
        resizeObserver.observe(node);
    }
    ///////////////////////////////////////////////// mutate
    var MutationType;
    (function (MutationType) {
        MutationType["Child"] = "child";
        MutationType["Tree"] = "tree";
        MutationType["Attr"] = "attr";
        MutationType["Char"] = "char";
    })(MutationType || (MutationType = {}));
    const AllMutationEls = new WeakMap;
    const mutationObserver = new MutationObserver(mutations => {
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            let map = AllMutationEls.get(mutation.target);
            if (!map)
                return;
            let detail = {
                target: mutation.target
            };
            let cbk = null;
            switch (mutation.type) {
                case 'subtree':
                    detail.type = MutationType.Tree;
                    cbk = map[MutationType.Tree];
                    break;
                case "childList":
                    detail.type = MutationType.Child;
                    detail.addedNodes = mutation.addedNodes;
                    detail.removedNodes = mutation.removedNodes;
                    cbk = map[MutationType.Child];
                    break;
                case "attributes":
                    detail.type = MutationType.Attr;
                    detail.attributeName = mutation.attributeName;
                    detail.oldValue = mutation.oldValue;
                    cbk = map[MutationType.Attr];
                    break;
                case "characterData":
                    detail.type = MutationType.Char;
                    detail.oldValue = mutation.oldValue;
                    cbk = map[MutationType.Char];
                    break;
            }
            if (cbk) {
                let ev = new CustomEvent('mutate', {
                    bubbles: false,
                    cancelable: false,
                    detail
                });
                cbk(ev);
            }
        }
    });
    function addMutation(node, cbk, parts) {
        let child = includes(parts, 'child');
        let attr = includes(parts, 'attr');
        let char = includes(parts, 'char');
        let tree = includes(parts, 'tree');
        let map = AllMutationEls.get(node);
        if (map)
            return;
        map = {};
        AllMutationEls.set(node, map);
        if (child) {
            map[MutationType.Child] = cbk;
        }
        if (attr) {
            map[MutationType.Attr] = cbk;
        }
        if (char) {
            map[MutationType.Char] = cbk;
        }
        if (tree) {
            map[MutationType.Tree] = cbk;
        }
        mutationObserver.observe(node, {
            childList: child,
            attributes: attr,
            characterData: char,
            subtree: tree
        });
    }
    ///////////////////////////////////////////////// outside
    document.addEventListener('mousedown', e => {
        let t = get(e.composedPath(), 0, e.target);
        AllOutsideDownEls.forEach(([node, cbk]) => {
            if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
                let ev = new CustomEvent('outside', {
                    bubbles: false,
                    cancelable: false,
                    detail: {
                        currentTarget: node,
                        event: e
                    },
                });
                cbk(ev, node);
            }
        });
    }, false);
    document.addEventListener('click', e => {
        let t = get(e.composedPath(), 0, e.target);
        AllOutsideClickEls.forEach(([node, cbk]) => {
            if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
                let ev = new CustomEvent('outside', {
                    bubbles: false,
                    cancelable: false,
                    detail: {
                        currentTarget: node,
                        event: e
                    },
                });
                cbk(ev, node);
            }
        });
    }, false);
    document.addEventListener('dblclick', e => {
        let t = get(e.composedPath(), 0, e.target);
        AllOutsideDblClickEls.forEach(([node, cbk]) => {
            if (!node.contains(t) && !node.contains(closest(t, (node) => node instanceof ShadowRoot, 'parentNode')?.host)) {
                let ev = new CustomEvent('outside', {
                    bubbles: false,
                    cancelable: false,
                    detail: {
                        currentTarget: node,
                        event: e
                    },
                });
                cbk(ev, node);
            }
        });
    }, false);
    function addOutsideMouseDown(node, cbk) {
        AllOutsideDownEls.push([node, cbk]);
    }
    function addOutsideClick(node, cbk) {
        AllOutsideClickEls.push([node, cbk]);
    }
    function addOutsideDblClick(node, cbk) {
        AllOutsideDblClickEls.push([node, cbk]);
    }
    function isExtEvent(evName) {
        return ExtEvNames.includes(evName);
    }
    function addExtEvent(evName, node, cbk, parts) {
        if (evName === 'resize') {
            addResize(node, cbk);
        }
        else if (evName === 'outside') {
            switch (parts[0]) {
                case 'mousedown':
                    addOutsideMouseDown(node, cbk);
                    break;
                case 'dblclick':
                    addOutsideDblClick(node, cbk);
                    break;
                case 'click':
                default:
                    addOutsideClick(node, cbk);
                    break;
            }
        }
        else if (evName === 'mutate') {
            addMutation(node, cbk, parts);
        }
    }

    const MODI_EV_DEBOUNCE = /,|^(debounce:.+)|(debounce$)/;
    const MODI_EV_THROTTLE = /,|^(throttle:.+)|(throttle$)/;
    const MODI_EV_SELF = 'self';
    const MODI_EV_STOP = 'stop';
    const MODI_EV_PREVENT = 'prevent';
    const MODI_EV_ONCE = 'once';
    const MODI_EV_MOUSE_LEFT = 'left';
    const MODI_EV_MOUSE_RIGHT = 'right';
    const MODI_EV_MOUSE_MIDDLE = 'middle';
    const MODI_EV_KEYBOARD_COMBO_CTRL = 'ctrl';
    const MODI_EV_KEYBOARD_COMBO_ALT = 'alt';
    const MODI_EV_KEYBOARD_COMBO_SHIFT = 'shift';
    const MODI_EV_KEYBOARD_COMBO_META = 'meta';
    const MODI_EV_KEYBOARD_KEY_MAP = {
        'esc': 'escape'
    };
    const MODI_PARAM_DIVIDER = ":";
    function addEvent(fullName, cbk, node, component) {
        let parts = fullName.split('.');
        let evName = parts.shift();
        let isOnce = parts.includes(MODI_EV_ONCE);
        let c = cbk;
        let modi;
        if (modi = find(parts, x => MODI_EV_DEBOUNCE.test(x))) {
            let params = modi.split(MODI_PARAM_DIVIDER);
            c = debounce(c, parseInt(params[1]) || 100);
        }
        if (modi = find(parts, x => MODI_EV_THROTTLE.test(x))) {
            let params = modi.split(MODI_PARAM_DIVIDER);
            c = throttle(c, parseInt(params[1]) || 100);
        }
        if (isOnce) {
            c = once(c);
        }
        if (isExtEvent(evName)) {
            addExtEvent(evName, node, c, parts);
            return c;
        }
        let listener = (e) => {
            if (parts.includes(MODI_EV_PREVENT))
                e.preventDefault();
            if (parts.includes(MODI_EV_STOP))
                e.stopPropagation();
            if (parts.includes(MODI_EV_SELF) && e.target !== e.currentTarget)
                return;
            if (e instanceof MouseEvent) {
                if (parts.includes(MODI_EV_MOUSE_LEFT) && e.button != 0)
                    return;
                if (parts.includes(MODI_EV_MOUSE_RIGHT) && e.button != 2)
                    return;
                if (parts.includes(MODI_EV_MOUSE_MIDDLE) && e.button != 1)
                    return;
            }
            else if (e instanceof KeyboardEvent) {
                if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_CTRL)[0] && !e.ctrlKey)
                    return;
                if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_ALT)[0] && !e.altKey)
                    return;
                if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_SHIFT)[0] && !e.shiftKey)
                    return;
                if (remove(parts, p => p == MODI_EV_KEYBOARD_COMBO_META)[0] && !e.metaKey)
                    return;
                let checkKeys = map(parts, k => MODI_EV_KEYBOARD_KEY_MAP[k] || k);
                if (!checkKeys.includes(e.key.toLowerCase()))
                    return;
            }
            c(e);
        };
        node.addEventListener(evName, listener);
        //record
        let evAry = component.__events[evName];
        if (!evAry)
            evAry = component.__events[evName] = [];
        evAry.push([node, listener]);
        return listener;
    }

    const ATTR_PREFIX_EVENT = "@";
    const ATTR_PREFIX_PROP = ".";
    const ATTR_PREFIX_BOOLEAN = "?";
    const ATTR_PREFIX_REF = "*";
    const ATTR_PROP_DELIMITER = ":";
    const ATTR_REF = "ref";
    const ATTR_KEY = "key";
    const EXP_ATTR_CHECK = /[.?-a-z]+\s*=\s*(['"])\s*([^='"]*<\!--c_ui-pl_df-->){2,}.*?\1/ims;
    const EXP_PLACEHOLDER = /<\s*[a-z0-9-]+([^>]*<\!--c_ui-pl_df-->)*[^>]*?(?<!-)>/imgs;
    const SLOT_KEY_PROPS = 'slot-props';
    const HTML_CACHE = new Map();
    const DOM_CACHE = new Map();
    const VAR_CACHE = new Map();
    var VarType;
    (function (VarType) {
        VarType["Event"] = "event";
        VarType["Directive"] = "directive";
        VarType["DirectiveTag"] = "directiveTag";
        VarType["DirectiveAttr"] = "directiveAttr";
        VarType["DirectiveProp"] = "directiveProp";
        VarType["DirectiveText"] = "directiveText";
        VarType["DirectiveSlot"] = "directiveSlot";
        VarType["Attr"] = "attr";
        VarType["AttrProp"] = "attrProp";
        VarType["AttrBool"] = "attrBool";
        VarType["AttrRef"] = "attrRef";
        VarType["AttrSlot"] = "attrSlot";
        VarType["AttrKey"] = "key";
        VarType["Ref"] = "ref";
        VarType["Text"] = "text";
    })(VarType || (VarType = {}));
    const ComponentUpdatePointsMap = new WeakMap();
    const DirectiveUpdatePointsMap = new WeakMap();
    const TextOrSlotDirectiveExecutorMap = new WeakMap();
    const TextOrSlotDirectiveArgsMap = new WeakMap();
    const TextOrSlotDirectiveUpdatePointMap = new WeakMap();
    const DirectiveArgsMap = new WeakMap();
    /**
     * 提供渲染函数相关操作
     * @author holyhigh2
     */
    /**
     * 高性能dom生成及变量绑定算法
     * 1. 使用占位符拼接HTML字符串，占位符与变量需要按照顺序对应
     * 2. 插入dom片段，并遍历元素+注释节点, 搜索占位符
     *  1. 按顺序遍历所有attr，发现一个属性值含有占位符时，标记节点及属性名，以便变量可以进行绑定（ 如果key是事件/ref则内容仅允许一个占位符）
     *  2. 如果是注释节点
     *    1. 在后面追加同内容注释节点，标记两个节点，以便变量可以进行绑定
     *    2. 在中间插入变量内容
     * 3. 只有表达式是一个指令时才能绑定依赖
     * @param component
     * @param tmpl
     * @returns [html,vars]
     */
    function buildHTML(component, tmpl) {
        let html = "";
        let vars = concat(tmpl.vars);
        let l = tmpl.strings.length - 1;
        let vl = tmpl.vars.length - 1;
        let varIndex = 0;
        for (let i = 0; i <= l; i++) {
            const str = tmpl.strings[i];
            let val = get(vars, varIndex, '');
            if (val instanceof Template) {
                let [h, v] = buildHTML(component, val);
                val = h;
                vars.splice(varIndex, 1, ...v);
                varIndex += v.length - 1;
            }
            else {
                val = i > vl ? "" : PLACEHOLDER;
            }
            varIndex++;
            html = html + str + val;
        }
        {
            //attr check
            let rs = html.match(EXP_ATTR_CHECK);
            if (rs) {
                let errorMsg = replaceAll(rs[0], PLACEHOLDER, '${...}');
                showError(`Parse error: attribute value can be set only one interpolation —— \n ${errorMsg}`);
                return ['', vars];
            }
        }
        let i = 0;
        html = html.replace(EXP_PLACEHOLDER, (a, b) => {
            let rs = replaceAll(a, PLACEHOLDER, () => PLACEHOLDER.replace('-->', '') + (i++));
            return rs;
        });
        html = html.replace(EXP_STR, '$1><').trim();
        return [html, vars];
    }
    function buildVars(component, tmpl) {
        let vars = concat(tmpl.vars);
        let l = tmpl.strings.length - 1;
        for (let i = 0; i <= l; i++) {
            let val = get(tmpl.vars, i, '');
            if (val instanceof Template) {
                let [h, v] = buildHTML(component, val);
                vars.splice(i, 1, ...v);
            }
        }
        return vars;
    }
    const PLACEHOLDER = "<!--c_ui-pl_df-->";
    const PLACEHOLDER_PREFFIX = "<!--c_ui-pl_df";
    const PLACEHOLDER_EXP = /<!--c_ui-pl_df\d*(-->)?/;
    /**
     * 构建模板为DOM结构
     * @param html
     */
    function buildTmplate(updatePoints, html, vars, renderComponent, isDirective = false) {
        const container = document.createElement("div");
        container.innerHTML = html;
        const hasVarChache = VAR_CACHE.has(renderComponent.constructor);
        if (!isDirective && hasVarChache && !DOM_CACHE.has(renderComponent.constructor)) {
            DOM_CACHE.set(renderComponent.constructor, container.cloneNode(true));
        }
        let NodeSn = 0;
        //遍历dom
        const nodeIterator = document.createNodeIterator(container, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
        let currentNode;
        let varIndex = 0;
        let slotComponent;
        let varCacheMap = hasVarChache ? undefined : {};
        let keyNode = null;
        let keyVal = '';
        while ((currentNode = nodeIterator.nextNode())) {
            NodeSn++;
            let varCacheQueue = hasVarChache ? undefined : [];
            if (slotComponent && !slotComponent.contains(currentNode)) {
                slotComponent = undefined;
            }
            if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
                if (currentNode instanceof CompElem) {
                    slotComponent = currentNode;
                }
                let props = {};
                let attrs = toArray(currentNode.attributes);
                for (let i = 0; i < attrs.length; i++) {
                    const attr = attrs[i];
                    let { name, value } = attr;
                    //todo 这里需要修改为 data-slot-xx
                    if (name === SLOT_KEY_PROPS) {
                        let slotName = currentNode.getAttribute('name') || 'default';
                        varCacheQueue && varCacheQueue.push({ type: VarType.AttrSlot, name: slotName, attrName: name });
                        continue;
                    } //endif
                    if (startsWith(name, PLACEHOLDER_PREFFIX)) {
                        let val = vars[varIndex];
                        //support directive only for now
                        if (isArray(val) && isSymbol(val[0])) {
                            let [, args, executor, checker, varChain] = val;
                            checker(EnterPointType.TAG);
                            let point = new EnterPoint(currentNode, name.substring(1), EnterPointType.TAG);
                            let attrMap = DirectiveArgsMap.get(currentNode);
                            if (!attrMap) {
                                attrMap = {};
                                DirectiveArgsMap.set(currentNode, attrMap);
                            }
                            attrMap[Symbol.keyFor(val[0])] = [point, renderComponent, slotComponent];
                            let po = new UpdatePoint(varIndex, currentNode);
                            po.isDirective = true;
                            po.value = val;
                            po.isComponent = !!slotComponent;
                            updatePoints.push(po);
                            if (keyNode && keyNode?.contains(currentNode)) {
                                po.key = keyVal;
                            }
                            varIndex++;
                            executor(point, args, undefined, { renderComponent, slotComponent, varChain });
                            varCacheQueue && varCacheQueue.push({ type: VarType.DirectiveTag, point, up: po, name });
                        }
                        currentNode.removeAttribute(name);
                        continue;
                    } //endif
                    //@event.stop.prevent.debounce
                    if (name[0] === ATTR_PREFIX_EVENT) {
                        let cbk = (e) => { };
                        let po = null;
                        let hasValue = false;
                        if (PLACEHOLDER_EXP.test(value)) {
                            po = new UpdatePoint(varIndex, currentNode);
                            po.notUpdated = true;
                            if (keyNode && keyNode?.contains(currentNode)) {
                                po.key = keyVal;
                            }
                            updatePoints.push(po);
                            let val = vars[varIndex];
                            if (!isFunction(val)) {
                                showTagError(currentNode.tagName, `Event '${name}' must be a function`);
                                continue;
                            }
                            cbk = val.bind(renderComponent);
                            varIndex++;
                            hasValue = true;
                        }
                        let evName = name.substring(1);
                        addEvent(evName, cbk, currentNode, renderComponent);
                        currentNode.removeAttribute(name);
                        varCacheQueue && varCacheQueue.push({ type: VarType.Event, up: po, name: evName, attrName: name, value: hasValue });
                        continue;
                    } //endif
                    if (name === ATTR_REF) {
                        if (PLACEHOLDER_EXP.test(value)) {
                            let val = vars[varIndex];
                            if (!has(val, 'current')) {
                                showTagError(currentNode.tagName, `Ref must be a RefObject`);
                                continue;
                            }
                            let po = new UpdatePoint(varIndex, currentNode);
                            po.notUpdated = true;
                            if (keyNode && keyNode?.contains(currentNode)) {
                                po.key = keyVal;
                            }
                            updatePoints.push(po);
                            varIndex++;
                            val.current = currentNode;
                            varCacheQueue && varCacheQueue.push({ type: VarType.Ref, up: po, attrName: name });
                        }
                        currentNode.removeAttribute(name);
                        continue;
                    } //endif
                    if (name === ATTR_KEY) {
                        let val = vars[varIndex];
                        currentNode.setAttribute(name, val);
                        let po = new UpdatePoint(varIndex, currentNode);
                        po.notUpdated = true;
                        if (keyNode && keyNode?.contains(currentNode)) {
                            po.key = keyVal;
                        }
                        updatePoints.push(po);
                        varIndex++;
                        keyNode = currentNode;
                        keyVal = val;
                        varCacheQueue && varCacheQueue.push({ up: po, type: VarType.AttrKey });
                        if (updatePoints.length > 0) {
                            updatePoints.forEach(up => {
                                up.key = up.key ?? val;
                            });
                        }
                        continue;
                    } //endif
                    //校验变量必须是表达式
                    if (name[0] === ATTR_PREFIX_PROP && !PLACEHOLDER_EXP.test(value)) {
                        showTagError(currentNode.tagName, `Prop '${name}' must be an interpolation`);
                        continue;
                    }
                    if (PLACEHOLDER_EXP.test(value)) {
                        let val = vars[varIndex];
                        let po = new UpdatePoint(varIndex, currentNode, name.replace(/\.|\?|@/, ''), value);
                        po.isComponent = !!slotComponent;
                        if (keyNode && keyNode?.contains(currentNode)) {
                            po.key = keyVal;
                        }
                        if (name[0] === ATTR_PREFIX_PROP ||
                            name[0] === ATTR_PREFIX_BOOLEAN ||
                            name[0] === ATTR_PREFIX_REF) {
                            if (isArray(val) && isSymbol(val[0])) {
                                let [, args, executor, checker, varChain] = val;
                                checker(EnterPointType.PROP);
                                let attrName = name.substring(1);
                                let point = new EnterPoint(currentNode, attrName, EnterPointType.PROP);
                                let attrMap = DirectiveArgsMap.get(currentNode);
                                if (!attrMap) {
                                    attrMap = {};
                                    DirectiveArgsMap.set(currentNode, attrMap);
                                }
                                attrMap[attrName] = [point, renderComponent, slotComponent];
                                executor(point, args, undefined, { renderComponent, slotComponent });
                                po.value = val;
                                po.isDirective = true;
                                varCacheQueue && varCacheQueue.push({ type: VarType.DirectiveProp, up: po, point, name, attrName });
                            }
                            else if (name[0] === ATTR_PREFIX_BOOLEAN) {
                                po.isToggleProp = true;
                                po.value = !!val;
                                let attrName = name.substring(1);
                                if (po.value)
                                    currentNode.setAttribute(attrName, '');
                                varCacheQueue && varCacheQueue.push({ type: VarType.AttrBool, name: attrName, up: po, attrName: name });
                            }
                            else if (name[0] === ATTR_PREFIX_REF) {
                                po.value = val;
                                let refNames = name.substring(1);
                                const [refNamec, prop] = refNames.split(ATTR_PROP_DELIMITER);
                                let refName = refNamec;
                                switch (prop) {
                                    case 'camel':
                                        refName = camelCase(refName);
                                        break;
                                    case 'kebab':
                                        refName = kebabCase(refName);
                                        break;
                                    case 'snake':
                                        refName = snakeCase(refName);
                                        break;
                                }
                                po.attrName = refName;
                                currentNode.setAttribute(refName, val);
                                varCacheQueue && varCacheQueue.push({ type: VarType.AttrRef, up: po, name, attrName: refName });
                            }
                            else {
                                if (!(currentNode instanceof CompElem) && currentNode.tagName !== 'SLOT') {
                                    showTagError(currentNode.tagName, `Prop '${name}' can only be set on a CompElem or a slot`);
                                }
                                else {
                                    let propName = camelCase(name.substring(1));
                                    if (!(propName in currentNode) && currentNode.tagName !== 'SLOT') {
                                        showTagError(currentNode.tagName, `Prop '${name}' is not defined in ${currentNode.tagName}`);
                                    }
                                    let fromPath = OBJECT_VAR_PATH.get(val);
                                    if (fromPath) {
                                        currentNode._propObjectKeyMap[fromPath.join(PATH_SEPARATOR)] = propName;
                                    }
                                    po.value = val;
                                    po.isProp = true;
                                    props[propName] = val;
                                    varCacheQueue && varCacheQueue.push({ type: VarType.AttrProp, up: po, name: propName, attrName: name });
                                }
                            }
                            currentNode.removeAttribute(name);
                            val = '';
                        }
                        else {
                            po.value = val;
                            let executor;
                            let args;
                            let cache = { type: VarType.Attr, up: po, attrName: name };
                            if (isArray(val) && isSymbol(val[0])) {
                                let type = EnterPointType.ATTR;
                                if (name === "class") {
                                    type = EnterPointType.CLASS;
                                }
                                else if (name === "style") {
                                    type = EnterPointType.STYLE;
                                }
                                let [, ags, exec, checker, varChain] = val;
                                checker(type);
                                po.isDirective = true;
                                po.attrName = name;
                                let point = new EnterPoint(currentNode, name, type);
                                let attrMap = DirectiveArgsMap.get(currentNode);
                                if (!attrMap) {
                                    attrMap = {};
                                    DirectiveArgsMap.set(currentNode, attrMap);
                                }
                                attrMap[name] = [point, renderComponent, slotComponent];
                                args = ags;
                                executor = exec;
                                val = '';
                                cache.type = VarType.DirectiveAttr;
                                cache.point = point;
                            }
                            value = replace(value, PLACEHOLDER_EXP, val);
                            //回填
                            attr.value = value;
                            executor && executor(cache.point, args, undefined, { renderComponent, slotComponent });
                            varCacheQueue && varCacheQueue.push(cache);
                        }
                        updatePoints.push(po);
                        varIndex++;
                    } //endif
                } //endfor
                if (currentNode instanceof CompElem) {
                    currentNode._initProps(props);
                    currentNode._regWrapper(renderComponent);
                }
                else if (currentNode instanceof HTMLSlotElement) {
                    renderComponent._bindSlot(currentNode, currentNode.name || 'default', props);
                }
            }
            else {
                let comment = currentNode;
                let ph = `<!--${comment.nodeValue}-->`;
                if (ph !== PLACEHOLDER) {
                    continue;
                }
                let po = new UpdatePoint(varIndex, currentNode);
                if (keyNode && keyNode?.contains(currentNode)) {
                    po.key = keyVal;
                }
                updatePoints.push(po);
                po.isComponent = !!slotComponent;
                po.isText = true;
                let val = vars[varIndex];
                if (isArray(val) && isSymbol(val[0])) {
                    const diName = Symbol.keyFor(val[0]);
                    //插入start占位符
                    let startComment;
                    startComment = document.createComment(`compelem-${renderComponent.tagName}-${diName}-start`);
                    po.textNode = startComment;
                    comment.parentNode.insertBefore(startComment, comment);
                    comment.nodeValue = `compelem-${renderComponent.tagName}-${diName}-end`;
                    comment._diName = diName;
                    po.isDirective = true;
                    po.value = val;
                    let pType = slotComponent ? EnterPointType.SLOT : EnterPointType.TEXT;
                    let [, args, executor, checker, varChain] = val;
                    checker(pType);
                    let point = new EnterPoint(startComment, "", pType);
                    point.endNode = comment;
                    TextOrSlotDirectiveArgsMap.set(comment, [point, renderComponent, slotComponent, args, varChain]);
                    TextOrSlotDirectiveExecutorMap.set(comment, executor);
                    TextOrSlotDirectiveUpdatePointMap.set(comment, po);
                    Collector.startRender(comment);
                    let tmpl = executor(point, args, undefined, { renderComponent, slotComponent, varChain });
                    Collector.endRender(renderComponent);
                    //render
                    if (tmpl) {
                        let nodes = buildDirectiveView(comment, tmpl[1], renderComponent);
                        if (nodes && nodes.length > 0) {
                            DomUtil.insertBefore(comment, Array.from(nodes));
                        }
                    }
                    val = undefined;
                    varCacheQueue && varCacheQueue.push({ type: pType === EnterPointType.SLOT ? VarType.DirectiveSlot : VarType.DirectiveText, up: po, point });
                }
                else {
                    po.value = val;
                    varCacheQueue && varCacheQueue.push({ type: VarType.Text, up: po });
                }
                varIndex++;
                let text = toString(val ?? '');
                let textDom = document.createTextNode(text);
                comment.parentNode.insertBefore(textDom, comment);
                po.textNode = textDom;
            }
            if (varCacheMap && varCacheQueue)
                varCacheMap[NodeSn] = varCacheQueue;
            if (keyNode && !keyNode.contains(currentNode) && keyNode !== currentNode) {
                keyNode = null;
                keyVal = '';
            }
        }
        if (!isDirective && varCacheMap)
            VAR_CACHE.set(renderComponent.constructor, varCacheMap);
        return container.childNodes;
    }
    function buildTmplate2(updatePoints, vars, component) {
        let container = DOM_CACHE.get(component.constructor)?.cloneNode(true);
        let varMap = VAR_CACHE.get(component.constructor);
        //遍历dom
        const nodeIterator = document.createNodeIterator(container, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
        let currentNode;
        let slotComponent;
        let varIndex = 0;
        let NodeSn = 0;
        while ((currentNode = nodeIterator.nextNode())) {
            NodeSn++;
            let po;
            if (slotComponent && !slotComponent.contains(currentNode)) {
                slotComponent = undefined;
            }
            if (currentNode instanceof HTMLElement || currentNode instanceof SVGElement) {
                if (currentNode instanceof CompElem) {
                    slotComponent = currentNode;
                }
                let props = {};
                let varCacheQueue = varMap[NodeSn];
                varCacheQueue.forEach(vp => {
                    let val = vars[varIndex++];
                    switch (vp.type) {
                        case VarType.Event:
                            po = clone(vp.up);
                            if (!vp.value) {
                                varIndex--;
                            }
                            if (vp.value)
                                addEvent(vp.name, val.bind(component), currentNode, component);
                            currentNode.removeAttribute(vp.attrName);
                            break;
                        case VarType.AttrSlot:
                            if (slotComponent && vp.name);
                            currentNode.removeAttribute(vp.attrName);
                            break;
                        case VarType.Ref:
                            po = clone(vp.up);
                            val.current = currentNode;
                            currentNode.removeAttribute(vp.attrName);
                            break;
                        case VarType.AttrKey:
                            po = clone(vp.up);
                            currentNode.setAttribute(ATTR_KEY, val);
                            break;
                        case VarType.AttrBool:
                            po = clone(vp.up);
                            po.value = !!val;
                            po.node = currentNode;
                            if (po.value)
                                currentNode.setAttribute(vp.name, '');
                            currentNode.removeAttribute(vp.attrName);
                            break;
                        case VarType.AttrProp:
                            po = clone(vp.up);
                            po.value = val;
                            po.node = currentNode;
                            props[vp.name] = val;
                            if (vp.attrName)
                                currentNode.removeAttribute(vp.attrName);
                            break;
                        case VarType.AttrRef:
                        case VarType.Attr:
                            po = clone(vp.up);
                            po.value = val;
                            po.node = currentNode;
                            currentNode.setAttribute(vp.attrName, val);
                            if (VarType.AttrRef === vp.type)
                                currentNode.removeAttribute(vp.name);
                            break;
                        case VarType.DirectiveAttr:
                        case VarType.DirectiveTag:
                        case VarType.DirectiveProp:
                            po = clone(vp.up);
                            po.value = val;
                            po.node = currentNode;
                            let point = clone(vp.point);
                            point.startNode = currentNode;
                            let [sym, args, executor, checker, varChain] = val;
                            let attrMap = DirectiveArgsMap.get(currentNode);
                            if (!attrMap) {
                                attrMap = {};
                                DirectiveArgsMap.set(currentNode, attrMap);
                            }
                            attrMap[vp.attrName ?? Symbol.keyFor(sym)] = [point, component, slotComponent];
                            executor(point, args, undefined, { renderComponent: component, slotComponent, varChain });
                            if (VarType.DirectiveAttr === vp.type) {
                                let attrValue = currentNode.getAttribute(vp.attrName);
                                attrValue = replace(attrValue, PLACEHOLDER_EXP, '');
                                currentNode.setAttribute(vp.attrName, attrValue);
                            }
                            if (vp.name)
                                currentNode.removeAttribute(vp.name);
                            break;
                    }
                    if (po)
                        updatePoints.push(po);
                });
                if (currentNode instanceof CompElem) {
                    currentNode._initProps(props);
                    currentNode._regWrapper(component);
                }
                else if (currentNode instanceof HTMLSlotElement) {
                    component._bindSlot(currentNode, currentNode.name || 'default', props);
                }
            }
            else {
                let varCacheQueue = varMap[NodeSn];
                varCacheQueue.forEach(vp => {
                    let val = vars[varIndex++];
                    switch (vp.type) {
                        case VarType.DirectiveSlot:
                        case VarType.DirectiveText:
                            po = clone(vp.up);
                            po.value = val;
                            po.node = currentNode;
                            let [sym, args, executor, checker, varChain] = val;
                            let diName = Symbol.keyFor(sym);
                            let startComment = document.createComment(`compelem-${component.tagName}-${diName}-start`);
                            po.textNode = startComment;
                            currentNode.parentNode.insertBefore(startComment, currentNode);
                            currentNode.nodeValue = `compelem-${component.tagName}-${diName}-end`;
                            let point = clone(vp.point);
                            point.startNode = startComment;
                            point.endNode = currentNode;
                            TextOrSlotDirectiveArgsMap.set(currentNode, [point, component, slotComponent, args, varChain]);
                            TextOrSlotDirectiveExecutorMap.set(currentNode, executor);
                            TextOrSlotDirectiveUpdatePointMap.set(currentNode, po);
                            Collector.startRender(currentNode);
                            let tmpl = executor(point, args, undefined, { renderComponent: component, slotComponent, varChain });
                            Collector.endRender(component);
                            //render
                            let nodes = buildDirectiveView(currentNode, tmpl[1], component);
                            if (nodes && nodes.length > 0) {
                                DomUtil.insertBefore(currentNode, Array.from(nodes));
                            }
                            break;
                        case VarType.Text:
                            po = clone(vp.up);
                            po.node = currentNode;
                            let text = toString(val ?? '');
                            let textDom = document.createTextNode(text);
                            currentNode.replaceWith(textDom);
                            // currentNode.parentNode!.insertBefore(textDom, currentNode);
                            po.textNode = textDom;
                            break;
                    }
                    if (po)
                        updatePoints.push(po);
                });
                //todo...
            }
        }
        return container.childNodes;
    }
    function buildView(tmpl, component) {
        let updatePoints = [];
        let nodes;
        if (HTML_CACHE.has(component.constructor)) {
            let htmlTmpl = HTML_CACHE.get(component.constructor);
            let vars = buildVars(component, tmpl);
            if (DOM_CACHE.has(component.constructor)) {
                nodes = buildTmplate2(updatePoints, vars, component);
            }
            else {
                nodes = buildTmplate(updatePoints, htmlTmpl, vars, component);
            }
        }
        else {
            let [html, vars] = buildHTML(component, tmpl);
            HTML_CACHE.set(component.constructor, html);
            nodes = buildTmplate(updatePoints, html, vars, component);
        }
        ComponentUpdatePointsMap.set(component, updatePoints);
        return nodes;
    }
    function buildDirectiveView(pointNode, tmpl, component) {
        let [html, vars] = buildHTML(component, tmpl);
        let updatePoints = [];
        let nodes = buildTmplate(updatePoints, html, vars, component, true);
        DirectiveUpdatePointsMap.set(pointNode, updatePoints);
        return nodes;
    }
    function updateView(tmpl, comp, updatePoints, changedKeys) {
        if (isBlank(join(tmpl.strings)))
            return;
        if (!ComponentUpdatePointsMap.has(comp))
            return;
        let vars = tmpl.flatVars(comp);
        updatePoints = updatePoints ?? ComponentUpdatePointsMap.get(comp);
        for (let i = 0; i < updatePoints.length; i++) {
            const up = updatePoints[i];
            let varIndex = up.varIndex;
            if (varIndex < 0)
                continue;
            if (up.notUpdated)
                continue;
            let oldValue = up.value;
            let newValue = vars;
            let node = up.node;
            let indexSegs = split(varIndex, PATH_SEPARATOR);
            for (let l = 0; l < indexSegs.length; l++) {
                const seg = indexSegs[l];
                newValue = get(newValue, seg);
                if (newValue && newValue.vars && i < indexSegs.length - 1) {
                    newValue = newValue.vars;
                }
            }
            //check
            if (!isObject(oldValue) && oldValue === newValue)
                continue;
            let elNode = node;
            if (up.isDirective) {
                //指令
                let [sym, oldArgs, executor, , varChain] = up.value;
                let args = TextOrSlotDirectiveArgsMap.get(node);
                if (!args) {
                    const argsMap = DirectiveArgsMap.get(node);
                    args = argsMap[up.attrName] || argsMap[Symbol.keyFor(sym)];
                }
                let [point, renderComponent, slotComponent] = args;
                let [, newArgs] = newValue;
                const tsUp = TextOrSlotDirectiveUpdatePointMap.get(node);
                if (tsUp) {
                    tsUp.value = newValue;
                    const tsdArgs = TextOrSlotDirectiveArgsMap.get(node);
                    tsdArgs[3] = newArgs;
                }
                updateDirective(point, newArgs, oldArgs, executor, renderComponent, slotComponent, varChain, point.type == EnterPointType.TEXT || point.type == EnterPointType.SLOT);
            }
            else if (up.isToggleProp) {
                //布尔特性
                if ((!!newValue) === oldValue)
                    continue;
                elNode.toggleAttribute(up.attrName, !!newValue);
                set(elNode, up.attrName, !!newValue);
            }
            else if (up.isProp) {
                //子组件属性
                if (!isObject(newValue) && newValue === oldValue)
                    continue;
                //如果node是slot则触发组件的slot更新
                if (node instanceof CompElem) {
                    if (isObject(newValue) && Object.is(newValue, oldValue)) {
                        let targetVarName = camelCase(up.attrName);
                        let path = [targetVarName];
                        if (changedKeys && changedKeys.length > 0) {
                            let kStr = '';
                            let fromVarName = join(OBJECT_VAR_PATH.get(up.value), PATH_SEPARATOR);
                            changedKeys.forEach(k => {
                                if (k.startsWith(fromVarName) && k.length > kStr.length) {
                                    kStr = k;
                                }
                            });
                            path = concat(split(kStr.replace(fromVarName, targetVarName), PATH_SEPARATOR));
                        }
                        notifyUpdate(node, oldValue, path);
                    }
                    else {
                        node._updateProps({ [up.attrName]: newValue });
                    }
                }
                else if (node instanceof HTMLSlotElement) {
                    comp._updateSlot(node.getAttribute('name') || 'default', up.attrName, newValue);
                }
            }
            else if (up.attrName) {
                //特性
                if (!isEqual(oldValue, newValue)) {
                    switch (up.attrName) {
                        case 'value':
                            if (node instanceof HTMLInputElement) {
                                node.value = newValue;
                                break;
                            }
                        default:
                            node.setAttribute(up.attrName, replace(up.attrTmpl, PLACEHOLDER_EXP, newValue + ''));
                    }
                }
            }
            else if (up.isText) {
                let textNode = up.textNode;
                textNode.textContent = toString(newValue ?? '');
            }
            up.value = newValue;
        } //endfor
    }
    function updateDirectiveView(node, comp, tmpl, updatePoints) {
        const render = TextOrSlotDirectiveExecutorMap.get(node);
        const [point, renderComponent, slotComponent, oldArgs, varChain] = TextOrSlotDirectiveArgsMap.get(node);
        const up = TextOrSlotDirectiveUpdatePointMap.get(node);
        if (!tmpl) {
            let rs = render(point, up.value[1], oldArgs, { renderComponent, slotComponent, varChain });
            if (!rs)
                return;
            tmpl = rs[1];
        }
        //合并
        if (tmpl && tmpl.vars[0] instanceof Template) {
            let tStrAry = [];
            let tVarAry = [];
            each(tmpl.vars, v => {
                tVarAry.push(...v.vars);
                tStrAry.push(...map(v.vars, v => '1'));
            });
            tStrAry.push('1');
            tmpl = new Template(tStrAry, tVarAry);
        }
        if (updatePoints) {
            DirectiveUpdatePointsMap.set(node, updatePoints);
        }
        updatePoints = updatePoints ?? DirectiveUpdatePointsMap.get(node);
        updateView(tmpl, comp, updatePoints);
    }
    const DomUtil = {
        insertBefore: function (node, newNodes) {
            if (!node.parentNode)
                return;
            let fragment = document.createDocumentFragment();
            fragment.append(...newNodes);
            node.parentNode.insertBefore(fragment, node);
        },
        remove: function (startNode, endNode) {
            if (startNode === endNode) {
                startNode?.parentNode?.removeChild(startNode);
                return;
            }
            let nextNode = startNode.nextSibling;
            while (nextNode && nextNode !== endNode) {
                nextNode?.parentNode?.removeChild(nextNode);
                nextNode = startNode.nextSibling;
            }
        }
    };
    //////////////////////////////////////////////////// interfaces
    /**
     * 标签函数，用于构建模板
     * @param strings
     * @param vars
     */
    function html(strings, ...vars) {
        return new Template(isString(strings) ? [strings] : strings, vars);
    }
    const EXP_STR = /([a-z0-9"'])\s*>\s*</img;

    /**
     * 视图模板
     * @author holyhigh2
     */
    class Template {
        strings;
        vars;
        constructor(strings, vars) {
            this.strings = concat(strings);
            this.vars = vars;
        }
        //解析模板中的key
        getKey() {
            let vars = this.vars;
            let k = '';
            each(this.strings, (str, i) => {
                if (EXP_KEY.test(str)) {
                    k = toString(vars[i]);
                    return false;
                }
            });
            return k;
        }
        getKeys() {
            let vars = this.vars;
            let ks = [];
            for (let i = 0; i < this.strings.length; i++) {
                const str = this.strings[i];
                if (EXP_KEY.test(str)) {
                    let k = toString(vars[i]);
                    ks.push(k);
                }
            }
            if (isEmpty(ks)) {
                vars.forEach(v => {
                    if (v instanceof Template) {
                        let k = v.getKey();
                        ks.push(k);
                    }
                });
            }
            return ks;
        }
        /**
       * 追加tmpl
       * 交接处模板进行合并
       * @param tmpl
       */
        append(tmpl) {
            let lastStr = last(this.strings);
            tmpl.strings.forEach((str, i) => {
                if (i == 0) {
                    this.strings[this.strings.length - 1] = lastStr + str;
                    return;
                }
                this.strings.push(str);
            });
            this.vars = concat(this.vars, tmpl.vars);
            return this;
        }
        /**
         * 指定位置插入模板
         * @param position 字符模板位置
         * @param tmpl
         * @returns
         */
        insert(position, tmpl) {
            let firstStr = tmpl.strings.shift();
            this.strings[position] += firstStr;
            this.strings.splice(position + 1, 0, ...tmpl.strings);
            this.vars.splice(position, 0, ...tmpl.vars);
            return this;
        }
        getHTML(comp) {
            let [html, vars] = buildHTML(comp, this);
            let nodes = buildTmplate([], html, vars, comp);
            return reduce(nodes, (a, v) => a + (v.outerHTML ?? ''), '');
        }
        /**
         * 对var中的Template类型进行合并
         */
        flatVars(comp) {
            let vars = concat(this.vars);
            let l = this.strings.length - 1;
            let varIndex = 0;
            for (let i = 0; i <= l; i++) {
                let val = get(vars, varIndex, '');
                if (val instanceof Template && val.vars.length > 0) {
                    let [h, v] = buildHTML(comp, val);
                    val = h;
                    vars.splice(varIndex, 1, ...v);
                    varIndex += v.length - 1;
                }
                varIndex++;
            }
            return vars;
        }
    }

    function computed(target, propertyKey, descriptor) {
        if (!descriptor.get) {
            showError(`Computed '${propertyKey}' must be a getter`);
        }
        if (!has(target.constructor, DecoratorKey.COMPUTED)) {
            target.constructor[DecoratorKey.COMPUTED] = isEmpty(target.constructor[DecoratorKey.COMPUTED]) ? {} : cloneDeep(target.constructor[DecoratorKey.COMPUTED]);
        }
        target.constructor[DecoratorKey.COMPUTED][propertyKey] = descriptor.get;
    }

    /**
     * 定义防抖函数
     * 同时会创建一个以 _$__ 结尾的非防抖版本
     * @example
     *  @debounced(50, true)
     *
     * @param wait 抖动间隔，单位ms
     */
    class DebouncedDecorator extends Decorator {
        static get priority() {
            return Number.MAX_VALUE;
        }
        created(component, classProto, fieldName, ...args) {
            let fn = get(component, fieldName);
            set(component, fieldName, debounce(fn, this.wait, this.immediate));
            let proto = Reflect.getPrototypeOf(component);
            if (proto && !get(proto, fieldName + '_$__')) {
                set(proto, fieldName + '_$__', fn);
            }
        }
        beforeMount(component, setReactive, ...args) {
        }
        mounted(component, setReactive, ...args) {
        }
        updated(component, changed) {
        }
        get targets() {
            return [DecoratorType.METHOD];
        }
        wait;
        immediate;
        result;
        constructor(wait, immediate = false) {
            super();
            this.wait = wait;
            this.immediate = immediate;
        }
    }
    decorator(DebouncedDecorator);

    /**
     * 定义一次性函数
     * 同时会创建一个以 _$__ 结尾的非一次性版本
     * @example
     *  @onced
     *
     * @param wait 抖动间隔，单位ms
     */
    class OncedDecorator extends Decorator {
        static get priority() {
            return Number.MAX_VALUE;
        }
        created(component, classProto, fieldName, ...args) {
            let fn = bind(get(component, fieldName), component);
            set(component, fieldName, once(fn));
            let proto = Reflect.getPrototypeOf(component);
            if (proto && !get(proto, fieldName + '_$__')) {
                set(proto, fieldName + '_$__', fn);
            }
        }
        beforeMount(component, setReactive, ...args) {
        }
        mounted(component, setReactive, ...args) {
        }
        updated(component, changed) {
        }
        get targets() {
            return [DecoratorType.METHOD];
        }
        wait;
        result;
        constructor() {
            super();
        }
    }
    decorator(OncedDecorator);

    /**
     * 缓存策略
     */
    var QueryCache;
    (function (QueryCache) {
        QueryCache["ONCE"] = "once";
        QueryCache["UPDATABLE"] = "updatable"; //每次update结束都会更新缓存
    })(QueryCache || (QueryCache = {}));
    /**
     * css查询装饰器
     * @example
     *  @query('l-popup', QueryCache.ONCE)
     */
    class QueryDecorator extends Decorator {
        static get priority() {
            return Number.MAX_VALUE;
        }
        created(component, classProto, fieldName, ...args) {
        }
        mounted(component, setReactive, ...args) {
        }
        get targets() {
            return [DecoratorType.FIELD];
        }
        selector;
        cache;
        result;
        constructor(selector, cache) {
            super();
            this.selector = selector;
            this.cache = cache;
        }
        static getKey(selector) {
            return selector;
        }
        getter(component) {
            this.result = component.shadowRoot?.querySelector(this.selector);
        }
        beforeMount(component, setReactive, classProto, fieldName, ...args) {
            const that = this;
            Reflect.defineProperty(component, fieldName, {
                get() {
                    if (that.result && that.cache) {
                        return that.result;
                    }
                    that.getter(component);
                    return that.result;
                }
            });
        }
        updated(component, changed) {
            if (this.cache !== QueryCache.UPDATABLE)
                return;
            this.getter(component);
        }
    }
    class QueryAllDecorator extends QueryDecorator {
        getter(component) {
            this.result = component.shadowRoot?.querySelectorAll(this.selector);
        }
    }
    const query = decorator(QueryDecorator);
    decorator(QueryAllDecorator);

    function state(options) {
        if (arguments.length === 1) {
            return (target, stateKey) => {
                defineState(target, stateKey, options);
            };
        }
        let target = arguments[0], stateKey = arguments[1];
        defineState(target, stateKey, { prop: "" });
    }
    function defineState(target, stateKey, options) {
        if (!has(target.constructor, DecoratorKey.STATES)) {
            const mixinStates = {};
            let parentCtor = target.constructor;
            while ((parentCtor = _getSuper(parentCtor)) !== CompElem) {
                merge(mixinStates, parentCtor[DecoratorKey.STATES] ? cloneDeep(parentCtor[DecoratorKey.STATES]) : {});
            }
            Reflect.defineProperty(target.constructor, DecoratorKey.STATES, {
                configurable: false,
                enumerable: false,
                value: mixinStates
            });
        }
        options.shallow = options.shallow || false;
        target.constructor[DecoratorKey.STATES][stateKey] = options;
    }

    /**
     * class用注解，用于自动注册自定义组件
     * @param name 自定义组件名称
     */
    function tag(name) {
        return (target) => {
            if (target) {
                //attrChange
                if (target.prototype.hasOwnProperty('attributeChangedCallback')) {
                    let cbk = target.prototype.attributeChangedCallback;
                    target.prototype.attributeChangedCallback = function (name, oldValue, newValue) {
                        CompElem.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
                        cbk.call(this, name, oldValue, newValue);
                    };
                }
                //connectedCallback
                if (target.prototype.hasOwnProperty('connectedCallback')) {
                    let cbk = target.prototype.connectedCallback;
                    target.prototype.connectedCallback = function () {
                        CompElem.prototype.connectedCallback.call(this);
                        cbk.call(this);
                    };
                }
                //disconnectedCallback
                if (target.prototype.hasOwnProperty('disconnectedCallback')) {
                    let cbk = target.prototype.disconnectedCallback;
                    target.prototype.disconnectedCallback = function () {
                        CompElem.prototype.disconnectedCallback.call(this);
                        cbk.call(this);
                    };
                }
                customElements.define(name, target);
            }
        };
    }

    /**
     * 定义节流函数
     * 同时会创建一个以 _$__ 结尾的非节流版本
     * @example
     *  @throttled(50, true)
     *
     * @param wait 抖动间隔，单位ms
     */
    class ThrottledDecorator extends Decorator {
        static get priority() {
            return Number.MAX_VALUE;
        }
        created(component, classProto, fieldName, ...args) {
            let fn = get(component, fieldName);
            set(component, fieldName, throttle(fn, this.wait));
            let proto = Reflect.getPrototypeOf(component);
            if (proto && !get(proto, fieldName + '_$__')) {
                set(proto, fieldName + '_$__', fn);
            }
        }
        beforeMount(component, setReactive, ...args) {
        }
        mounted(component, setReactive, ...args) {
        }
        updated(component, changed) {
        }
        get targets() {
            return [DecoratorType.METHOD];
        }
        wait;
        result;
        constructor(wait) {
            super();
            this.wait = wait;
        }
    }
    decorator(ThrottledDecorator);

    function watch(source, options) {
        return (target, name) => {
            if (!has(target.constructor, DecoratorKey.WATCH)) {
                target.constructor[DecoratorKey.WATCH] = isEmpty(target.constructor[DecoratorKey.WATCH]) ? {} : cloneDeep(target.constructor[DecoratorKey.WATCH]);
            }
            const sources = isArray(source) ? source : [source];
            sources.forEach(src => {
                let watchKey = src.replaceAll('.', PATH_SEPARATOR);
                let srcList = target.constructor[DecoratorKey.WATCH][watchKey];
                if (!isArray(srcList)) {
                    srcList = target.constructor[DecoratorKey.WATCH][watchKey] = [];
                }
                srcList.push({ source: src, options, handler: target[name] });
            });
        };
    }

    const Ignores = ['key'];
    /**
     * 绑定属性到节点上，如果节点是组件会使用in操作符判断是否props
     * @param styles 对象/数组/字符串
     */
    directive(function Bind(obj) {
        return (point, [obj], oldArgs) => {
            let el = point.startNode;
            if (oldArgs) {
                each(obj, (v, k) => {
                    el.setAttribute(k, v);
                });
                return;
            }
            if (el instanceof CompElem) {
                //判断是否prop
                let props = {};
                let attrs = {};
                let propDefs = get(el.constructor, DecoratorKey.PROPS);
                each(obj, (v, k) => {
                    if (Ignores.includes(k))
                        return;
                    let ck = camelCase(k);
                    let propDef = propDefs[ck];
                    if (propDef) {
                        props[k] = v;
                    }
                    else {
                        attrs[k] = v + '';
                    }
                });
                el._initProps(props, attrs);
            }
            else {
                each(obj, (v, k) => {
                    el.setAttribute(k, v);
                });
            }
        };
    }, [EnterPointType.TAG]);

    const ClassLastMap = new Map();
    /**
     * 根据变量内容自动插入class，仅能用于class属性
     * @param styles 对象/数组/字符串
     */
    directive(function Classes(clazz) {
        return (point, [clazz], oldArgs, { renderComponent }) => {
            let rs = [];
            if (isArray(clazz)) {
                rs = compact(clazz);
            }
            else if (isObject(clazz)) {
                rs = flatMap(clazz, (v, k) => v ? k : []);
            }
            else if (isString(clazz)) {
                rs = clazz.split(' ');
            }
            if (rs.length < 1 && !oldArgs)
                return;
            let el = point.startNode;
            if (ClassLastMap.get(el) && ClassLastMap.get(el).length === rs.length && isMatch(ClassLastMap.get(el), rs))
                return;
            let lastCls = ClassLastMap.get(el);
            each(lastCls, (cls) => {
                el.classList.remove(cls);
            });
            each(rs, cls => {
                el.classList.add(cls);
            });
            lastCls = concat(rs);
            ClassLastMap.set(el, lastCls);
        };
    }, [EnterPointType.CLASS]);

    const LastValueMap = new Map();
    const LastTmplMap$1 = new Map();
    /**
     * 循环列表并自动优化列表更新
     * foreach循环的只能是节点，且必须有key属性。非节点元素会被过滤掉
     * 使用序号作为key时可能会导致异常问题
     */
    const forEach = directive(function ForEach(value, cbk) {
        return (point, newArgs, oldArgs, { varChain }) => {
            let el = point.startNode;
            let lastRenderTmpl = comboTmpl(newArgs[0], cbk, el);
            if (oldArgs && oldArgs[0]) {
                //更新
                const lastAry = LastValueMap.get(el);
                // const lastRenderTmpl = LastTmplMap.get(el)
                if (isEmpty(point.getNodes()) && (!newArgs || isEmpty(newArgs[0])))
                    return [DirectiveUpdateTag.NONE, lastRenderTmpl];
                if (lastAry && isMatch(lastAry, newArgs[0]) && lastAry.length === newArgs[0].length)
                    return [DirectiveUpdateTag.NONE, lastRenderTmpl];
            }
            LastValueMap.set(el, clone(newArgs[0]));
            if (oldArgs) {
                return [DirectiveUpdateTag.UPDATE, lastRenderTmpl];
            }
            return [DirectiveUpdateTag.APPEND, lastRenderTmpl];
        };
    }, [EnterPointType.TEXT, EnterPointType.SLOT]);
    function comboTmpl(value, cbk, el) {
        //1. 产生模板
        let tmpls = map(value, (v, k) => {
            return cbk(v, k);
        });
        if (tmpls.length < 1) {
            let lastRenderTmpl = new Template([], []);
            LastTmplMap$1.set(el, lastRenderTmpl);
            return lastRenderTmpl;
        }
        //2. 检查 & 合并模板
        let keyAry = [];
        let strs = [];
        const combStrings = [];
        const combVars = [];
        for (let l = 0; l < tmpls.length; l++) {
            const tmpl = tmpls[l];
            let lastStr = last(strs);
            let vars = tmpl.vars;
            let hasNoKey = true;
            let tmplStrs = tmpl.strings;
            for (let i = 0; i < tmplStrs.length; i++) {
                const str = tmplStrs[i];
                if (EXP_KEY.test(str)) {
                    let key = vars[i] + '';
                    if (keyAry.includes(key)) {
                        showError(`forEach - duplicate key '${key}'`);
                        return;
                    }
                    keyAry.push(key);
                    hasNoKey = false;
                }
                if (i == 0 && lastStr) {
                    strs[strs.length - 1] = lastStr + str;
                    continue;
                }
                strs.push(str);
            }
            if (hasNoKey) {
                showError("forEach - missing 'key' prop");
                return;
            }
            let lastVar = last(combStrings);
            if (lastVar && tmplStrs.length > 0) {
                combStrings[combStrings.length - 1] = trim(lastVar) + tmplStrs.shift();
            }
            combStrings.push('');
            combVars.push(tmpl);
        }
        combStrings.push('');
        let lastRenderTmpl = new Template(combStrings, combVars);
        LastTmplMap$1.set(el, lastRenderTmpl);
        return lastRenderTmpl;
    }

    const LastTmplMap = new WeakMap();
    /**
     * 条件为真时返回参数1，否则返回参数2，仅能用于文本节点
     * @param condition 条件
     * @param tmpl 模板
     */
    directive(function IfElse(condition, ifTmpl, elseTmpl) {
        return (point, [condi, render], oldArgs, { renderComponent }) => {
            let el = point.endNode;
            if (oldArgs) {
                //更新
                if (!!condi === !!oldArgs[0]) {
                    let tmpl = LastTmplMap.get(el);
                    return [DirectiveUpdateTag.NONE, tmpl.call(renderComponent, condi)];
                }
                let tmpl = condi ? ifTmpl : elseTmpl;
                LastTmplMap.set(el, tmpl);
                return [DirectiveUpdateTag.REPLACE, tmpl.call(renderComponent, condi)];
            }
            else {
                let tmpl = condi ? ifTmpl : elseTmpl;
                LastTmplMap.set(el, tmpl);
                return [DirectiveUpdateTag.APPEND, tmpl.call(renderComponent, condition)];
            }
        };
    }, [EnterPointType.TEXT, EnterPointType.SLOT]);

    /**
     * 条件为真时返回内容，仅能用于文本节点
     * @param condition 条件
     * @param tmpl 模板
     */
    directive(function IfTrue(condition, tmplFn) {
        return (point, [condi, render], oldArgs) => {
            if (oldArgs) {
                //更新
                if (condi === oldArgs[0])
                    return [DirectiveUpdateTag.NONE, condi ? render() : html``];
                if (condi) {
                    return [DirectiveUpdateTag.REPLACE, condi ? render() : html``];
                }
                return [DirectiveUpdateTag.REMOVE];
            }
            else {
                return [DirectiveUpdateTag.APPEND, condi ? render() : html``];
            }
        };
    }, [EnterPointType.TEXT, EnterPointType.SLOT]);

    var ModelTriggerType;
    (function (ModelTriggerType) {
        ModelTriggerType["CHANGE"] = "change";
        ModelTriggerType["INPUT"] = "input";
    })(ModelTriggerType || (ModelTriggerType = {}));
    const PathMap = new WeakMap;
    /**
     * 实现双向绑定（仅支持静态路径，动态增加的属性路径无法识别）
     * 当用于组件时，监控 @update:value 事件
     * 当用于元素时，
     * - 对于 input/textarea 监控 @input，并设置 value 属性
     * - 对于 checkbox/radio 监控 @change，并设置 checked 属性
     * - 对于 select  监控 @change，并设置 value 属性
     * @param modelValue 双向绑定的组件变量
     * @param updateProp 绑定模型变更时的监控属性，默认 value
     */
    const model = directive(function Model(modelValue, updateProp = 'value') {
        return (point, newArgs, oldArgs, { varChain, renderComponent }) => {
            const node = point.startNode;
            if (oldArgs) {
                if (isEqual(newArgs, oldArgs))
                    return;
                if (!isEqual(newArgs, oldArgs)) {
                    let newValue = newArgs[0];
                    if (node instanceof CompElem) {
                        node._updateProps({ [updateProp]: newValue });
                    }
                    else if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
                        node.setAttribute(updateProp, newValue + '');
                        if (node instanceof HTMLSelectElement) {
                            let opt = find(node.querySelectorAll('option'), n => n.value == newValue);
                            if (opt) {
                                opt.selected = true;
                            }
                        }
                    }
                    else if (node instanceof HTMLInputElement) {
                        if (node.value == newValue)
                            return;
                        switch (node.type) {
                            case 'checkbox':
                            case 'radio':
                                if (!!newValue) {
                                    node.setAttribute('checked', '');
                                }
                                else {
                                    node.removeAttribute('checked');
                                }
                                break;
                            case 'text':
                            case 'email':
                            case 'number':
                            case 'password':
                            case 'search':
                            case 'tel':
                            case 'url':
                                node.setAttribute(updateProp, newValue + '');
                                set(node, updateProp, newValue);
                                break;
                            default:
                                node.setAttribute(updateProp, newValue + '');
                                break;
                        }
                    }
                }
                return;
            }
            if (get(node, '_model') === 'binded')
                return;
            let path = last(varChain);
            let joinedPath = path.join(PATH_SEPARATOR);
            let propFromPathKeys = Object.keys(renderComponent._propObjectKeyMap);
            if (propFromPathKeys.length > 0) {
                each(propFromPathKeys, k => {
                    if (joinedPath.startsWith(k)) {
                        let newPath = joinedPath.replace(k, renderComponent._propObjectKeyMap[k]);
                        path = newPath.split(PATH_SEPARATOR);
                        return false;
                    }
                });
                console.log(joinedPath);
            }
            PathMap.set(node, path);
            if (!isObject(modelValue) && !trim(modelValue))
                modelValue = '';
            if (node instanceof CompElem) {
                node._initProps({ [updateProp]: modelValue });
                node.addEventListener('update:' + updateProp, (e) => {
                    console.debug('Model =>', path);
                    set(renderComponent, path, e.detail.value);
                });
                set(node, '_model', 'binded');
            }
            else if (node instanceof HTMLTextAreaElement) {
                node.setAttribute(updateProp, modelValue + '');
                node.addEventListener('input', (e) => {
                    console.debug('Model =>', path);
                    let t = e.target;
                    set(renderComponent, path, t.value);
                });
                set(node, '_model', 'binded');
            }
            else if (node instanceof HTMLInputElement) {
                let propName = '';
                let evName = '';
                switch (node.type) {
                    case 'checkbox':
                    case 'radio':
                        propName = 'checked';
                        evName = 'change';
                        break;
                    case 'text':
                    case 'email':
                    case 'number':
                    case 'password':
                    case 'search':
                    case 'tel':
                    case 'url':
                        propName = 'value';
                        evName = 'input';
                        break;
                    default:
                        propName = 'value';
                        evName = 'input';
                        break;
                }
                node.setAttribute(updateProp ?? propName, modelValue + '');
                node.addEventListener(evName, (e) => {
                    console.debug('Model =>', path);
                    let t = e.target;
                    set(renderComponent, path, t.value);
                });
                set(node, '_model', 'binded');
            }
            else if (node instanceof HTMLSelectElement) {
                node.setAttribute(updateProp, modelValue + '');
                node.addEventListener('change', (e) => {
                    console.debug('Model =>', path);
                    let t = e.target;
                    set(renderComponent, path, t.value);
                });
                set(node, '_model', 'binded');
            }
        };
    }, [EnterPointType.TAG]);

    const DisplayMap = new Map();
    /**
     * display的快捷指令
     * 如果
     * @param isvisible 是否显示
     * @param cbk 显示状态变更后调用的回调函数
     */
    directive(function Show(isVisible, cbk) {
        return (point, [condi], oldArgs) => {
            if (oldArgs && condi === oldArgs[0])
                return;
            let el = point.startNode;
            if (!DisplayMap.has(el)) {
                let dis = el.style.display;
                DisplayMap.set(el, dis == 'none' ? 'unset' : dis);
            }
            el.style.display = condi ? DisplayMap.get(el) : 'none';
            if (cbk) {
                cbk(el, condi);
            }
        };
    }, [EnterPointType.TAG]);

    /**
     * 创建一个动态插槽内容
     * @param cbk 回调函数，函数接收插槽上定义得变量
     * @param slotName 插槽名词，默认default
     */
    directive(function Slot(cbk, slotName) {
        return (point, newArgs, oldArgs, { renderComponent, slotComponent }) => {
            if (oldArgs)
                return;
            cbk = cbk.bind(renderComponent);
            slotComponent._bindSlotHook(slotName || 'default', cbk);
        };
    }, [EnterPointType.SLOT]);

    /**
     * Css 辅助类
     */
    class CssHelper {
        /**
         * 用于转换style对象为标准style字符串，会自动转换对象key为短横线格式
         * @param styles 样式对象
         * @returns
         */
        static getCssText(styles, important = false) {
            if (isString(styles))
                return styles;
            return join(map(styles, (v, k) => {
                if (k.startsWith('--'))
                    return k + ":" + v + (important ? ' !important' : '');
                return kebabCase(k) + ":" + v + (important ? ' !important' : '');
            }), ';');
        }
        /**
         * 设置样式
         * @param styles 样式字符串或样式对象
         * @param node HTML元素
         * @returns 每个样式的旧值map
         */
        static setStyle(styles, node) {
            if (isString(styles) && !trim(styles))
                return {};
            let css = CssHelper.getCssText(styles);
            let oldValueMap = {};
            each(css.split(';'), prop => {
                let kv = prop.split(':');
                let k = trim(kv[0]);
                let v = trim(kv[1]);
                oldValueMap[k] = node.style.getPropertyValue(k);
                node.style.setProperty(k, v);
            });
            return oldValueMap;
        }
    }

    const StyleMap = new Map();
    let StyleSn = 0;
    /**
     * 根据变量内容自动插入class，仅能用于style属性
     * @param styles 对象/字符串
     */
    directive(function Styles(styles) {
        return (point, newArgs, oldArgs, { renderComponent }) => {
            let el = point.startNode;
            let styleId = StyleMap.get(el);
            if (!styleId) {
                styleId = 'style_d' + StyleSn++;
                StyleMap.set(el, styleId);
            }
            renderComponent.nextTick(() => {
                CssHelper.setStyle(newArgs[0], el);
            }, styleId);
        };
    }, [EnterPointType.STYLE]);

    /**
     * 类似Model，实现属性的同步跟踪
     * 设置组件prop，并监控 @update:prop 事件
     * @param syncValue 双向绑定的组件变量
     */
    directive(function Sync(syncValue) {
        return (point, newArgs, oldArgs, { renderComponent, varChain }) => {
            const targetComponent = point.startNode;
            if (oldArgs) {
                if (!isEqual(newArgs, oldArgs)) {
                    let attrName = point.attrName;
                    targetComponent._updateProps({ [attrName]: newArgs[0] });
                }
                return;
            }
            let modelPath = last(varChain);
            let attrName = point.attrName;
            //todo _setParentProps接口不应该外部使用
            targetComponent._initProps({ [attrName]: syncValue });
            targetComponent.addEventListener('update:' + attrName, (e) => {
                set(renderComponent, modelPath, e.detail.value);
            });
        };
    }, [EnterPointType.PROP]);

    /**
     * 分支指令，具有switch / else if 两种模式
     * @example
     *  switch 模式
     * ${when(var, {
        closed: () => html``, //case 1
        connecting: () => html``, //case 2
        default: () => html``// default是switch模式下的关键字key
       })}

       else if 模式
     * ${when(this.editingTitle, [
        [(v: any) => v.substring(2) > 0, () => html`<div style="${PageHome.tunnelLight}"></div>`],
        [(v: any) => v == 'closed', () => html`<div style="${PageHome.tunnelLight}"></div>`],
        [() => true, () => html`默认`]
        ])}
     *
     * @param condition 条件
     * @param tmpl 模板
     */
    directive(function When(value, cases) {
        return (point, [value, cases], oldArgs) => {
            let defaultFn = () => html``;
            let conditionList = [];
            let tmplList = [];
            each(cases, (v, k) => {
                if (isFunction(v)) {
                    conditionList.push(k);
                    tmplList.push(v);
                }
                else {
                    let condiFn = v[0];
                    let tmplFn = v[1];
                    conditionList.push(condiFn);
                    tmplList.push(tmplFn);
                }
                if (k === 'default') {
                    defaultFn = v;
                }
            });
            let i = findIndex(conditionList, c => {
                if (isFunction(c)) {
                    return c(value);
                }
                else {
                    return c == value;
                }
            });
            if (oldArgs)
                return [DirectiveUpdateTag.REPLACE, call(tmplList[i] ?? defaultFn)];
            return [DirectiveUpdateTag.APPEND, call(tmplList[i] ?? defaultFn)];
        };
    }, [EnterPointType.TEXT, EnterPointType.SLOT]);

    let TestComp = class TestComp extends CompElem {
        //////////////////////////////////// props
        childData = {};
        //////////////////////////////////// watch
        function(nv) {
            console.log('子组件变更...', nv);
        }
        watchCa(nv) {
            console.log('子组件变更222...', nv);
        }
        //////////////////////////////////// styles
        mounted() {
        }
        render() {
            console.log('子组件视图......');
            return html`<div>${JSON.stringify(this.childData)} <button @click="${this.changeTest}">修改子组件并更新父组件</button><select ${model(this.childData.a)}>
      <option value="123">123</option>
      <option value="234">234</option>
      <option value="345">345</option>
    </select></div>`;
        }
        changeTest() {
            this.childData.a = Math.random() * 100 >> 0;
        }
    };
    __decorate([
        prop
    ], TestComp.prototype, "childData", void 0);
    __decorate([
        watch('childData', { deep: true })
    ], TestComp.prototype, "function", null);
    __decorate([
        watch('childData.a')
    ], TestComp.prototype, "watchCa", null);
    TestComp = __decorate([
        tag("test-comp")
    ], TestComp);

    exports.PageTest = class PageTest extends CompElem {
        //////////////////////////////////// props
        arg = '';
        colorR = Math.random() * 255 % 255 >> 0;
        colorG = Math.random() * 255 % 255 >> 0;
        colorB = Math.random() * 255 % 255 >> 0;
        rotation = 0;
        test = { a: 1 };
        ary = [1, 2, 3, 4, 56, 34, 323, 88, 23, 45, 67, 89, 12, 78, 90];
        //////////////////////////////////// computed
        get color() {
            console.log('computed......');
            return `linear-gradient(90deg,rgb(${this.colorR},${this.colorG},${this.colorB}), rgb(${255 - this.colorR},${255 - this.colorG},${255 - this.colorB}));`;
        }
        //////////////////////////////////// watch
        function(nv) {
            console.log('父组件变更...', nv);
        }
        //////////////////////////////////// styles
        //静态样式
        static get styles() {
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
                    console.log('styles......color');
                    return `h2,p,i,h3{
        background-image:${this.color};
      }`;
                },
                () => {
                    console.log('styles......rotation');
                    return `h2,p,i,h3{
        filter:hue-rotate(${this.rotation}deg);
      }`;
                },
            ];
        }
        text = null;
        sloganIndex = 0;
        //////////////////////////////////// lifecycles
        updated(changed) {
            // console.log('updated......')
        }
        mounted() {
            console.warn('starting to change...');
            this.rotation = 1;
            this.rotation = 2;
            this.rotation = 3;
            this.colorR = 111;
            this.colorG = 222;
            this.colorB = 11;
            this.rotation = 12;
            this.nextTick(() => {
                console.log('nextTick......');
            });
            setInterval(() => {
                // this.rotation++
            }, 100);
            setInterval(() => {
                // this.test.a++
            }, 1000);
            window.xx = this;
            // setInterval(() => {
            //   this.text.classList.add('hide')
            //   setTimeout(() => {
            //     this.text.innerHTML = Slogan[this.sloganIndex % 4]
            //     this.sloganIndex++
            //     this.text.classList.remove('hide')
            //   }, 500);
            // }, 5000);
        }
        render() {
            console.log('父组件视图......');
            return html`<div>
            <h2>父组件 ${JSON.stringify(this.test)}</h2>
            <test-comp .child-data="${this.test}"></test-comp>
            <button @click="${this.changeTest}">修改父组件并更新子组件</button>
            <button @click="${this.changeTest2}">新增属性父组件并更新子组件</button>
<button @click="${this.changeFor}">更新for</button>
            ${forEach(this.ary, (item) => html`<span key="${item}">${item}, </span>`)}
        </div>`;
        }
        changeTest() {
            this.test.a = Math.random() * 100 >> 0;
        }
        changeTest2() {
            this.test.b = Math.random() * 100 >> 0;
        }
        changeFor() {
            this.ary = [];
            setTimeout(() => {
                this.ary.push(1);
                this.ary.push(2);
                this.ary.push(3);
                this.ary.push(4);
                this.ary.push(5);
            }, 100);
            // this.ary = [1, 2, 3, 4, 5]
        }
    };
    __decorate([
        prop
    ], exports.PageTest.prototype, "arg", void 0);
    __decorate([
        state
    ], exports.PageTest.prototype, "colorR", void 0);
    __decorate([
        state
    ], exports.PageTest.prototype, "colorG", void 0);
    __decorate([
        state
    ], exports.PageTest.prototype, "colorB", void 0);
    __decorate([
        state
    ], exports.PageTest.prototype, "rotation", void 0);
    __decorate([
        state({ shallow: false })
    ], exports.PageTest.prototype, "test", void 0);
    __decorate([
        state
    ], exports.PageTest.prototype, "ary", void 0);
    __decorate([
        computed
    ], exports.PageTest.prototype, "color", null);
    __decorate([
        watch('test', { deep: true })
    ], exports.PageTest.prototype, "function", null);
    __decorate([
        query('i[name="text"]')
    ], exports.PageTest.prototype, "text", void 0);
    exports.PageTest = __decorate([
        tag("page-test")
    ], exports.PageTest);

    Object.defineProperty(exports, '__esModule', { value: true });

}));
