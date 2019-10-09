namespace YA{
    export enum ExecutionModes{
        Devalopment,
        Production
    }
    export let executionMode:ExecutionModes = ExecutionModes.Devalopment;
    /*=========================================================
     * 常用正则表达式
     *========================================================*/

    // 正则:去掉字符串首尾空白字符
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;
    // 正则:整数
    export let intRegx :RegExp = /^\s*(\+\-)?\d+\s*$/;
    // 正则: 数字，小数
    export let numberRegx :RegExp = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    // 正则: 百分比
    export let percentRegx :RegExp = /^\s*(\+\-)?\s*\d{1，2}(?:.\d+)\s*\%\s*$/;
    export let quoteRegx:RegExp = /"/gi;
    

    /*=========================================================
     * ajax 函数，本框架不实现，由外部框架注入
     *========================================================*/

    export interface IAjaxOpts{
        method?:string;
        url?:string;
        data?:string;
        nocache?:boolean;
    }
    export interface IThenable{
        then(onFullfilled:Function,onReject?:Function):any;
    }
    export let ajax:(opts:IAjaxOpts)=>IThenable;

    /*=========================================================
     * trim 函数
     *========================================================*/

    /**
     * 去掉字符串两边的空白
     *
     * @export
     * @param {string} txt
     * @returns
     */
    export function trim(txt:string){
        return txt?txt.toString().replace(trimRegx,""):"";
    }
    

    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    export function isArray(obj){
        return Object.prototype.toString.call(obj)==="[object Array]";
    }

    export function isObject(obj){
        return Object.prototype.toString.call(obj)==="[object Object]";
    }



    /*=========================================================
     * 函数处理
     * 包含 固定this指针的delegate
     * 函数簇，多个类似的函数，调用时将依次调用里面的函数
     *========================================================*/

    /**
     * 函数代理，固定某个函数的this到指定的对象
     *
     * @export
     * @param {Function} func 要固定this的函数
     * @param {object} self this指向的对象
     * @param {number} [argc] (optional)函数有几个参数,不填写表示任意多参数
     * @returns 固定了this指针的函数
     */
    export function delegate(func:Function,self:object,argc?:number){
        if(argc===undefined) return function(){return func.apply(self,arguments);}
        if(argc===0) return function(){return func.call(self);}
        if(argc===1) return function(arg){return func.call(self,arg);}
        let factory = delegateFactories[argc];
        if(!factory){
            let argList="";
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `return function(${argList}){return func.call(self,${argList})}`;
            factory = delegateFactories[argc] = new Function("func","self",code) as (func:Function,self:object)=>Function;

        }
        return factory(func,self);
    }
    let delegateFactories:Array<(func:Function,self:object)=>Function>=[];


    /**
     * 函数簇执行上下文，可以作为函数簇add/remove的参数
     *
     * @export
     * @interface IFuncExecuteArgs
     */
    export interface IFuncExecuteArgs{
        handler:(...args:any[])=>any;   
        [name:string]:any;
        args?:any[] | boolean;
        self?:object;
        arg0?:any;
        arg1?:any;
    }

    /**
     * 函数簇
     * 自己也是一个函数
     * 调用这个函数会依次调用add 的函数
     *
     * @export
     * @interface IFuncs
     */
    export interface IFuncs{
        (...args:any[]):any;
        add(handler:Function|IFuncExecuteArgs);
        remove(handler:any);
    }

    
    
    /**
     * 创建函数簇
     *
     * @export
     * @param {number} [argc] (optional)函数参数个数，undefined表示任意多个
     * @param {(handler:any)=>Function} [ck] (optional)执行前检查函数，可以没有，表示所有的都执行；如果指定了该参数，在执行函数前会首先调用该函数，如果返回false表示未通过检查，不会执行
     * @param {(obj1:any,obj2:any)=>boolean} [eq] (optional) 等值检查函数。如果指定了，remove时会调用该函数来代替 ==
     * @returns {IFuncs}
     */
    export function createFuncs(argc?:number,ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean):IFuncs{
        let factory = funcsFactories[argc||0];
        if(!factory){
            let argList="";
            let isConst =false;
            if(argc===null){isConst = true;argc=24;}
            else if(argc>=24) throw new Error("参数最多只能有23个");
            for(let i = 0,j=argc;i<j;i++){
                if(argList)argList += ",";
                argList += "arg"+i;
            }
            let code = `var handlers = [];
var funcs = function(${argList}){
    var result;
                
    for(let i=0,j=handlers.length;i<j;i++){
        var handler = handlers[i];
        var rs;
        if(ck){
            handler = ck(handler);
            if(!handler) continue;
        }`;
            if(isConst){code+=`
        if(handler.handler){
            if(handler.args){
                if(handler.args===true){
                    rs = handler.handler.call(handler.self||this,handler.arg0,handler.arg1);
                }  else if(handler.args.length){
                    rs = handler.handler.apply(hanlder.self||this,handler.args);
                }
            }
              
        }
`;
            }else {code +=`
        let rs = handler(${argList});
`;
            }                    
code+=`
        if(rs!==undefined){
            result = rs;
            if(rs===false)break;
        }
    }
    return result;
};
funcs.__YA_FUNCS_HANLDERS = handlers;
funcs.add=function(handler){handlers.push(handler);}
funcs.remove=function(handler){
    for(var i=0,j=handlers.length;i<j;i++){
        var existed = handlers.shift();
        if(existed !==handler && (eq ?!eq(handler,existed):true)){continue;}
    }
}
return funcs;
`;
            factory = funcsFactories[argc] = new Function("ck","eq",code) as (ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs;

        }
        return factory(ck,eq);
    }
    let funcsFactories:Array<(ck?:(handler:any)=>Function,eq?:(obj1:any,obj2:any)=>boolean)=>IFuncs>=[];


    /*=========================================================
     * 数据处理相关类

     *========================================================*/

    
    /**
     * 数据路径
     * 给定一个字符串，比如 A.B.C
     * 当调用getValue(obj)/setValue(obj,value)时，表示在obj.A.B.C上赋值
     * 支持正向下标的数组表达式，比如 A.B[0].C,
     * 还支持反向下标的数组表达式
     * @export
     * @class DPath
     */
    export class DPath{
        
        fromRoot:boolean;
        constructor(pathOrValue:any,type?:string){
            if(type==="const"){
                this.getValue = (d)=>pathOrValue;
                this.setValue = (d,v)=>{
                    if(executionMode===ExecutionModes.Devalopment){console.warn("向一个const的DPath写入了值",this,d,v);}
                    return this;
                };
                return;
            }else if(type==="dynamic"){
                this.getValue = (d)=>pathOrValue(d);
                this.setValue = (d,v)=>{
                    pathOrValue(d,v);
                    return this;
                };
                return;
            }
            let path = pathOrValue as string;
            //$.user.roles[0].permissions:first.id;
            let lastAt:number= -1;
            let lastTokenCode:number; 
            let lastPropName:string;
            let isLastArr :boolean;
            let inBrace:boolean = false;
            let getterCodes :Array<string> = [];
            let setterCodes :Array<string> = ["var $current$;\n"];
            let buildCodes = (txt:string,isArr?:boolean)=>{
                if(isArr){
                    getterCodes.push("$obj$=$obj$["+txt+"];if(!$obj$===undefined)return $obj$;\n");
                }else {
                    getterCodes.push("$obj$=$obj$."+txt+";if(!$obj$===undefined)return $obj$;\n");
                }
                if(lastPropName){
                    if(isLastArr){
                        setterCodes.push("$current$=$obj$["+lastPropName+"];if(!$current$) $obj$=$obj$["+lastPropName+"]="+(isArr?"[]":"{}")+";else $obj$=$current$;\n");
                    }else{
                        setterCodes.push("$current$=$obj$."+lastPropName+";if(!$current$) $obj$=$obj$."+lastPropName+"="+(isArr?"[]":"{}")+";else $obj$=$current$;\n");
                    }
                }
                isLastArr = isArr;
                lastPropName=txt;
            }
            
            let tpath :string = "";
            for(let at:number=0,len:number=path.length;at<len;at++){
                let ch = path.charCodeAt(at);
                // .
                if(ch===46){
                    if(inBrace) throw new Error("Invalid DPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(lastPropName && lastTokenCode!=93) throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    lastPropName = txt;
                    if(txt==="$") this.fromRoot = true;
                    buildCodes(txt);
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
                //[
                else if(ch===91){
                    if(inBrace) throw new Error("Invalid DPath:" + path);
                    
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt===""){
                        if(!lastPropName|| lastTokenCode!==93)  throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;lastAt = at;continue;
                    }
                    buildCodes(txt);
                    inBrace = true;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                //]
                else if(ch===93){
                    if(!inBrace)  throw new Error("Invalid DPath:" + path);
                    let txt = path.substring(lastAt+1,at).replace(trimRegx,"");
                    if(txt==="")throw new Error("Invalid DPath:" + path);
                    let match  =txt.match(lastRegx);
                    if(match){
                        txt= "$obj$.length-1" + match;
                    }
                    buildCodes(txt,true);
                    inBrace = false;
                    lastTokenCode = ch;lastAt = at;continue;
                }
                
            }
            if(inBrace)  throw new Error("Invalid DPath:" + path);
            let txt = path.substr(lastAt+1).replace(trimRegx,"");
            if(txt){
                getterCodes.push("return $obj$."+txt+";\n");
                if(lastPropName){
                    if(isLastArr){
                        setterCodes.push("$current$=$obj$["+lastPropName+"];if(!$current$) $obj$=$obj$["+lastPropName+"]={};else $obj$=$current$;\n");
                    }else{
                        setterCodes.push("$current$=$obj$."+lastPropName+";if(!$current$) $obj$=$obj$."+lastPropName+"={};else $obj$=$current$;\n");
                    }
                    
                }
                setterCodes.push("$obj$." + txt+"=$value$;\nreturn this;\n");
            }else{
                getterCodes.pop();
                getterCodes.push("return $obj$["+lastPropName+"];");
                if(isLastArr){
                    setterCodes.push("$obj$["+lastPropName+"]=$value$;\nreturn this;\n");
                }else{
                    setterCodes.push("$obj$."+lastPropName+"=$value$;\nreturn this;\n");
                }
            }
            
            
            let getterCode = getterCodes.join("");
            let setterCode = setterCodes.join("");
            this.getValue = new Function("$obj$",getterCode) as (d)=>any;
            this.setValue = new Function("$obj$","$value$",setterCode) as (d,v)=>DPath;
        }
        getValue(data:any):any{}

        setValue(data:any,value:any):DPath{
            return this;
        }
        static fetch(pathtext:string):DPath{
            return DPaths[pathtext] ||(DPaths[pathtext]= new DPath(pathtext));
        }

        static const(value:any):DPath{
            return new DPath(value,"const");
        }
        static dymanic(value:Function):DPath{
            return new DPath(value,"dynamic");
        }
        static paths:{[name:string]:DPath};
    }
    let DPaths = DPath.paths={};

    export function extend(...args:any[]):any{
        let obj = arguments[0]||{};
        for(let i=1,j=arguments.length;i<j;i++){
            let src = arguments[i];
            for(let n in src) obj[n] = src[n];
        }
        return obj;
    }

    let lastRegx :RegExp = /^-\d+$/;

    export function replace(text:string,data:object){

    }
    let templateVar
    function makeTemplate(text:string){

    }
    
    /**
     * 对象合并
     *
     * @export
     * @param {*} dest 目标对象
     * @param {*} src 源对象
     * @param {string} [prop] 内部使用
     * @param {Array<any>} [refs] 内部使用，在循环引用时防止无穷循环
     * @returns
     */
    export function merge(dest:any,src:any,prop?:string,refs?:Array<any>){
        if(prop===undefined){
            if(dest===src) return dest;
            for(let n in src) merge(dest,src,prop,[]);
            return dest;
        }
        let srcValue = src[prop];
        if(srcValue===null) return dest[prop]=null;
        if(srcValue instanceof RegExp) return dest[prop] = srcValue;
        let destValue = dest[prop];
        if(srcValue===undefined) return destValue;
        
        let srcValueType = typeof srcValue;
        if(srcValueType==="string"|| srcValueType==="number"|| srcValueType==="boolean") {
            return dest[prop] = srcValue;
        }
        for(let i in refs){
            let ref = refs[i];
            if(ref.src===srcValue) {
                return dest[prop] = ref.target;
            }
        }

        let isSrcValueArray = Object.prototype.toString.call(srcValue)==="[object Array]";
        let target;
        if(!destValue) target = isSrcValueArray?[]:{};
        if(!target){
            if(typeof destValue!=='object'|| destValue instanceof RegExp) destValue = isSrcValueArray?[]:{};
        }else target = destValue;
        refs.push({src:srcValue,target:target});
        merge(target,srcValue);
        return dest[prop] = target;

    }

    export function deepClone(obj:any):any{
        if(!obj) return obj;
        let type = typeof obj;
        if(type==="object"){
            let result = isArray(obj)?[]:{};
            for(let n in obj){
                result[n] = deepClone(obj[n]);
            }
            return result;
        }
        return obj;
    }

    export interface IAccessor{
        getValue():any;
        setValue(value):any;

    }
    export interface IRange{
        min?:any;
        max?:any;
    }
    


    /*=========================================================
     * 事件处理

     *========================================================*/

    export function xable(injectTaget:Function|object,Xable:Function){
        if(injectTaget){
            let target:object = injectTaget;
            if(typeof injectTaget==="function") target = injectTaget.prototype;
            let src = Xable.prototype;
            for(let n in src){
                target[n] = src[n];
            }
        }
    }

    export interface IEventHandler{
        (sender:any,eventArgs:IEventArgs):any;
    }
    export interface IEventArgs{
        [key:string]:any;
        type?:string;
        src?:any;
        canceled?:boolean;
    }
    export interface IEventCapture{
        handler:IEventHandler;
        raw:IEventHandler;
        capture:object;
    }
    export interface IObservable{
        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable;
        notify(event:string,args:IEventArgs):IObservable;
        get_eventHandlers(event:string,addIfNone?:boolean):IFuncs;
    }
    

    export class Observable implements IObservable{
        private _eventMaps:{[evtName:string]:IFuncs};

        constructor(injectTaget?:Function|object){
            if(injectTaget)xable(injectTaget,Observable);
        }

        subscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable{
            let handlers = this.get_eventHandlers(event,true);
            handlers.add(capture?{handler:handler,capture:this,src:handler}:handler);
            return this;
        }
        unsubscribe(event:string,handler:IEventHandler,capture?:boolean):IObservable{
            if(event==="<clear-all>") {
                this._eventMaps = undefined;
                return this;
            } 
            let maps = this._eventMaps;
            if(maps) {
                let handlers = maps[event];
                if(handlers) handlers.remove(capture?{handler:handler,src:handler,capture:this}:handler);
            }
            return this;
        }

        notify(event:string,args:IEventArgs):IObservable{
            let maps = this._eventMaps;
            if(maps) {
                let handlers = maps[event];
                if(handlers)handlers.call(this,args);
            }
            return this;
        }
        get_eventHandlers(event:string,addIfNone?:boolean):IFuncs{
            let maps = this._eventMaps || (this._eventMaps={});
            let handlers = maps[event];
            if(!handlers && addIfNone) maps[event]=handlers=createFuncs(2
                ,(handler:any)=>(handler as IEventCapture).handler||handler
                ,(e1,e2)=>e1===e2||(e1.capture===e2.capture&& e1.raw==e2.raw)
            );
            return handlers;
        }
    }

    /*=========================================================
     * 网页处理
     *========================================================*/

    export function createElement(tagName:string){
        return document.createElement(tagName);
    }

    export let getStyle = (obj:HTMLElement,attr:string):string =>{
        if((obj as any).currentStyle){//兼容IE
            getStyle = YA.getStyle = (obj:HTMLElement,attr:string):string=>(obj as any).currentStyle[attr];
        }else{
            getStyle = YA.getStyle = (obj:HTMLElement,attr:string):string=>{
                let f:any = false;
                return getComputedStyle(obj,f)[attr];
            };
        }
        return getStyle(obj,attr);
    }
    export let attach = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.addEventListener){
            attach = YA.attach = (elem:HTMLElement,event:string,handler:Function)=>elem.addEventListener(event,handler as any,false);
        }else {
            attach = YA.attach = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).attachEvent("on" +event,handler as any);
        }
        return attach(elem,event,handler);
    }
    export let detech = (elem:HTMLElement,event:string,handler:Function)=>{
        if(elem.removeEventListener){
            detech = YA.detech = (elem:HTMLElement,event:string,handler:Function)=>elem.removeEventListener(event,handler as any,false);
        }else {
            detech = YA.detech = (elem:HTMLElement,event:string,handler:Function)=>(elem as any).detechEvent("on" +event,handler as any);
        }
        return detech(elem,event,handler);
    }

    export function replaceClass(element:HTMLElement,addedCss:string,removeCss?:string){
        let clsText = element.className||"";
        let clsNames = clsText.split(/\s+/g);
        for(let i =0,j= clsNames.length;i<j;i++){
            let clsn = clsNames.shift();
            if(clsn==="") continue;
            if(clsn===removeCss){ clsNames.push(addedCss);addedCss = null; continue;}
            clsNames.push(clsn);
        }
        if(addedCss) clsNames.push(addedCss);
        element.className = clsNames.join(" ");
    }
    export function isInview(element:HTMLElement):boolean{
        let doc = element.ownerDocument;
        while(element){
            if(element===doc.body) return true;
            element = element.parentNode as HTMLElement;
        }
        return false;
    }

    
    export enum Permissions{

        
        /**
         * 可读写
         */
        Writable,

        /**
         * 只读
         */
        Readonly,


        /**
         * 可查询
         */
        Queryable,

        /**
        * 隐藏
         */
        Hidden,
        /**
         * 禁止访问
         */
        Denied
        
        
    }

    export enum ViewTypes{
        detail,
        edit,
        list,
        query
    }

    export interface IFieldset{
        basePath?:string;
        TEXT(text:string):string;
    }

    export interface IFieldOpts{
        
        /**
         * 字段名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        name?:string;

        constValue?:any;

        /**
         * 类型
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        type?:string;

        
        /**
         * 是否是主键
         *
         * @type {boolean}
         * @memberof IFieldOpts
         */
        isPrimary?:boolean;


        /**
         *  在数据对象上的路径
         *
         * @type {IFieldPathsOpts|string}
         * @memberof IFieldOpts
         */
        dpath?:string;


        /**
         * 显示名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        label?:string;

        /**
         * 说明
         *
         * @type {string}
         * @memberof IField
         */
        remark?:string;

        

        validations?:{[name:string]:any};

        perm?:Permissions|string;
        group?:string;
    }

    export interface IDropdownFieldOpts extends IFieldOpts{
        itemKey?:string;
        itemText?:string;
        noSelectedText?:string;
        isObjectValue?:boolean;
        items?:any;
    }

    interface IInternalFieldsetOpts{
        name:string;
        fields:Field[];
        viewType:ViewTypes;

        bas_dpath?:string;
        list_bas_dpath?:string;
        filter_bas_dpath?:string;
    }

    export interface IFieldsetOpts{
        fields?:IFieldOpts[] | {[fieldname:string]:any};
        views:{[name:string]:IFieldsetOpts}

        viewType?:ViewTypes|string;

        bas_dpath?:string;
        list_bas_dpath?:string;
        filter_bas_dpath?:string;
    }

    export class Fieldset{
        opts:IFieldsetOpts;
        _viewOpts:{[name:string]:IInternalFieldsetOpts}
        constructor(opts:IFieldsetOpts){

        }
        createView(name?:any,initData?:any,perms?:{[fname:string]:string}) :FieldsetView{
            if(typeof name!=="string"){
                perms = initData;
                initData = name;
                name = "";

            }
            let viewOpts = this._viewOpts[name];
            if(!viewOpts){
                let fsOpts:IFieldsetOpts;
                if(!name) fsOpts = this.opts;
                else{
                    if(!this.opts.views) throw new Error("未能在fieldsetOpts中找到view:"+name);
                    fsOpts = this.opts.views[name];
                }
                if(!fsOpts) throw new Error("未能在fieldsetOpts中找到view:"+name);
                let fields = makeFields(this.opts.fields as IFieldOpts[],fsOpts.fields);
                viewOpts = extend({},fsOpts);
                viewOpts.fields = fields;
                if(typeof fsOpts.viewType==="string") viewOpts.viewType = ViewTypes[fsOpts.viewType];
                this._viewOpts[name] = viewOpts;
            }
            return null;
        }
    }

    function makeFields(entityFieldOpts:IFieldOpts[],viewFieldOpts:any):Field[]{
        let rs :Field[]=[];
        if(!viewFieldOpts){
            for(let i=0,j=entityFieldOpts.length;i<j;i++){
                let field = new Field(entityFieldOpts[i],this);
                rs.push(field);
            }
        }else {
            let fieldOpts:IFieldOpts[];
            if(!isArray(viewFieldOpts)){
                fieldOpts = [];
                for(let fname in viewFieldOpts){
                    let fvalue = viewFieldOpts[fname];
                    let fOpts :IFieldOpts;
                    if(typeof fvalue==="string"){
                        if(Permissions[fvalue]!==undefined){
                            fOpts ={
                                name:fname,
                                perm:fvalue
                            };
                        }
                    }else {
                        fOpts = fvalue;
                        if(!fOpts.name)fOpts.name = fname;
                    }
                    fieldOpts.push(fOpts);
                }
            }else fieldOpts = viewFieldOpts;
            for(let i=0,j=fieldOpts.length;i<j;i++){
                let fieldOpt = deepClone(fieldOpts[i]);
                for(let j=0,k=entityFieldOpts.length;j<k;j++){
                    let eFOpts = entityFieldOpts[j];
                    if(eFOpts.name===fieldOpt.name){
                        fieldOpt = merge(fieldOpt,eFOpts);
                        break;
                    }
                }
                let field = new Field(fieldOpt,this);
                rs.push(field);
            }
        }
        return rs;
    }

    export class FieldsetView{
        opts:IInternalFieldsetOpts;
        viewType:ViewTypes;
        permissions:{[fname:string]:string};
        data:any;
        element :HTMLElement;
        views:{[name:string]:FieldView};
        rows:{[name:string]:FieldView};

        constructor(opts:IInternalFieldsetOpts,initData:any,perms:any){
            this.permissions = perms||{};
            this.opts = opts;
            this.data = merge({},initData);
            this.viewType = opts.viewType;
        }

        render(wrapper?:HTMLElement):HTMLElement{
            if(!wrapper)wrapper = this.element;
            else this.element = wrapper;
            if(!wrapper) this.element = wrapper = YA.createElement("div");
            else wrapper.innerHTML = "";
            return wrapper;
        }

        _renderDetail(){
            let opts = this.opts;
            let fields = opts.fields;
            let perms = this.permissions;
            let data = this.data;

            let groups = {};
            for(let i =0,j=fields.length;i<j;i++){
                let field = fields[i];
                let perm = Permissions[perms[field.name]];
                if(perm===undefined) perm = field.permission;
                if(perm===Permissions.Denied) continue;
                

            }
        }
        TEXT(text:string):string{
            return text;
        }

    }


    
    

    export class Field{
        opts:IFieldOpts;
        name:string;
        type:string;
        dpath:DPath;
        label:string;
        validations:{[name:string]:any};
        required:boolean;
        fieldset:Fieldset;
        permission:Permissions;
        className:string;

        componentMaker:(field:Field,initValue:any,editable:boolean)=>IComponentWrapper;
        //dataViewCreator:(field:Field,fieldView:FieldView)=>IFieldViewAccessor;
    
        constructor(fieldOpts:IFieldOpts,fieldset?:Fieldset){
            this.opts = fieldOpts;
            this.fieldset = fieldset;
            this.type = fieldOpts.type || "text";
            this.name = fieldOpts.name;
            
            this.label = fieldOpts.label || this.name;
            this.validations = fieldOpts.validations || {};
            if(!this.validations[this.type]){
                let validator = validators[this.type];
                if(validator) this.validations[this.type] = true;
            }
            this.required = this.validations.required;
            this.className = "field " + this.type + " " + this.name;
            this.dpath = DPath.fetch(fieldOpts.dpath || this.name);
            this.permission = typeof fieldOpts.perm==="string"?Permissions[fieldOpts.perm]:fieldOpts.perm;
            this.componentMaker = fieldComponents[this.type] || fieldComponents["text"];
            
        }

        

        
        

        
        validate(value:any,lng:(txt:string)=>string,isCheckRequired:boolean):string{
            let validRs:string;
            if(this.required && isCheckRequired){
                let requireValid = validators["required"];
                validRs = requireValid(value,true,lng);
                if(validRs) return validRs;
            }
            let validations = this.validations;
            for(let validName in validations){
                if(validName==="required") continue;
                let validator = validators[validName];
                if(!validator){ 
                    if(executionMode===ExecutionModes.Devalopment) console.warn("找不到验证器",validName,this);
                    continue;
                }
                validRs = validator(value,validations[validName],lng);
                if(validRs) return validRs;
            }
            return validRs;
        }
    }

    export interface IComponentWrapper{
        element:HTMLElement;
        getViewValue:()=>any;
        setViewValue:(value:any)=>any;
    }

    let requiredValidator = (value,opts,lng:(txt:string)=>string):string=>{
        let msg;
        if(isObject(opts)) msg = opts.message;
        if(!value) return lng(msg || "必填");
        for(let n in value){
            return;
        }
        return lng(msg || "必填");
    } 
    export let validators :{[name:string]:(value,opts,lng:(txt:string)=>string)=>string} = {
        required:requiredValidator,
        length:(value:any,opts:any,lng:(txt:string)=>string)=>{
            let min,max,message;
            if(isObject(opts)){
                min = opts.min;max=opts.max;
                message = opts.message;
            }else max = parseInt(opts);
            if(!value) {
                if(min) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能少于{{min}}个字符").replace("{min}",min);
            }
            let len = value.toString().replace(trimRegx,"").length;
            if(min && len<min) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能少于{{min}}个字符").replace("{min}",min);
            if(max && len>max) return message ? message.replace("{{min}}",min).replace("{{max}}",min) :lng("长度不能超过{{max}}个字符").replace("{max}",max);
        },
        regex:(value:any,opts:any,lng:(txt:string)=>string)=>{
            let reg:RegExp ,message,result;
            if(opts.match){
                reg = opts;
                message = lng("格式不正确");
            }else {
                reg = opts.reg;
                message = lng(opts.message||"格式不正确");
            }
            if(!value)return;
            if(!reg.test(value.toString())) return message;
            return;
        },
    };


    let fieldComponents:any ={};
    fieldComponents.text = (field:FieldView,initValue:any,editable:boolean):IComponentWrapper =>{
        let elem:HTMLElement;
        let getViewValue :()=>any;
        let setViewValue:(val:any)=>void;
        if(editable){
            elem = YA.createElement("input");
            (elem as HTMLInputElement).type = "text";
            getViewValue = ()=>(elem as HTMLInputElement).value;
            setViewValue = (val:any)=>{(elem as HTMLInputElement).value= val===undefined ||val===null?"":val;}
            let tick:number;
            let onblur = () => {
                field.setValue((elem as HTMLInputElement).value,true);
            };
            let onhit = ()=>{
                if(tick){clearTimeout(tick);}
                tick = setTimeout(onblur, 100);
            }
            attach(elem,"keyup",onhit);
            attach(elem,"keydown",onhit);
            attach(elem,"blur",onblur);
        }else{
            
            elem = YA.createElement("span");
            getViewValue = ()=>elem.innerHTML;
            setViewValue = (val:any)=>{ elem.innerHTML = val===undefined ||val===null?"":val; };
        }
        setViewValue(initValue);

        return {
            element:elem,
            getViewValue:getViewValue,
            setViewValue:setViewValue
        };
    }

    export class FieldView{
        field:Field;
        fieldsetView:FieldsetView;
        data:any;
        element:HTMLElement;
        getViewValue:()=>any;
        setViewValue:(val:any)=>any;

        constructor(field:Field,fsv:FieldsetView,data:any){
            this.field =field;
            this.fieldsetView = fsv;
            this.data = data;
        }

        setValue(val:any,fromEvent?:boolean){
            this.field.dpath.setValue(this.data,val);
            if(!fromEvent){
                this.setViewValue(val);
            }
        }

        detail(){
            return this._detailOrEdit(false);
        }
        edit(){
            return this._detailOrEdit(true);
        }
        label(){
            return this._label(this.field,false);
        }
        cell(){
            let wrapper = this.element;
            let field = this.field;
            if(wrapper)wrapper.innerHTML="";
            wrapper = this.element = YA.createElement("div");
            let fieldWrapper = YA.createElement("div");
            fieldWrapper.className = field.className;

            let inputComp = field.componentMaker(field,field.dpath.getValue(this.data),false);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            return wrapper;
        }

        _detailOrEdit(editable:boolean){
            let wrapper = this.element;
            let field = this.field;
            if(wrapper)wrapper.innerHTML="";
            wrapper = this.element = YA.createElement("div");

            let fieldWrapper = YA.createElement("div");
            fieldWrapper.className = field.className;
            fieldWrapper.appendChild(this._label(field,true));

            let inputComp = field.componentMaker(field,field.dpath.getValue(this.data),editable);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            if(field.opts.remark)fieldWrapper.appendChild(this._remark(field));
            return wrapper;
        }



        _label(field:Field,requireMark:boolean):HTMLLabelElement{
            let labelElem = YA.createElement("label") as HTMLLabelElement;
            labelElem.className="field-label";
            labelElem.innerHTML =  this.fieldsetView.TEXT(field.label || field.name);
            if(field.required && requireMark) {
                let requireMark = YA.createElement("ins");
                requireMark.className="required";
                requireMark.innerHTML = "*";
                labelElem.appendChild(requireMark);
            }
            (labelElem as HTMLLabelElement).htmlFor = "";
            return labelElem;
        }
        _remark(field:Field):HTMLLabelElement{
            let labelElem = YA.createElement("label") as HTMLLabelElement;
            labelElem.className="field-remark";
            labelElem.innerHTML =  this.fieldsetView.TEXT(field.opts.remark);
            return labelElem;
        }
        

    }
}