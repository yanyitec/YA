namespace YA{
    export enum ExecutionModes{
        Devalopment,
        Production
    }
    export let executionMode:ExecutionModes = ExecutionModes.Devalopment;
    /*=========================================================
     * 常用正则表达式
     *========================================================*/

    
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

    export function ajax<T>(opts:IAjaxOpts):IThenable<T>{
        return null;
    }
    

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

    

    export function extend(...args:any[]):any{
        let obj = arguments[0]||{};
        for(let i=1,j=arguments.length;i<j;i++){
            let src = arguments[i];
            for(let n in src) obj[n] = src[n];
        }
        return obj;
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
            for(let n in src) merge(dest,src,n,[]);
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
        if(!target){
            return dest[prop] = deepClone(srcValue);
        }else{
            merge(target,srcValue);
            return dest[prop] = target;
        }
    }

    export function deepClone(obj:any):any{
        if(!obj) return obj;
        let type = typeof obj;
        if(type==="object"){
            let result = is_array(obj)?[]:{};
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
        let clsNames = ((element.classList as any) as string[]) || clsText.split(/\s+/g);
        let cs :string[]= [];
        for(let i =0,j= clsNames.length;i<j;i++){
            let clsn = clsNames[i];
            if(clsn==="" || clsn===addedCss || clsn===removeCss) continue;
            cs.push(clsn);
        }
        cs.push(addedCss);
        element.className = cs.join(" ");
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
        * 隐藏
         */
        Hidden,
        /**
         * 禁止访问
         */
        Denied
        
        
    }

    export enum ViewTypes{
        Detail,
        Edit,
        List,
        Query
    }

    export enum QueryTypes{

        Equal,
        GreaterThan,
        GreaterThanOrEqual,
        LessThan,
        LessThanOrEqual,
        Range
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

        permission?:Permissions|string;

        queryable?:QueryTypes|string;

        group?:string;
    }

    export interface IDropdownFieldOpts extends IFieldOpts{
        itemKey?:string;
        itemText?:string;
        noSelectedText?:string;
        isObjectValue?:boolean;
        items?:any;
    }

    export interface IInternalFieldsetOpts{
        name:string;
        fields:Field[];
        viewType:ViewTypes;
        url:string;
        dpath:DPath;
        filter_dpath:DPath; 
        rows_dpath:DPath;
        total_dpath:DPath;
        pageIndex_dpath:DPath;
        pageSize_dpath:DPath;
    }

    export interface IFieldsetOpts{
        fields?:IFieldOpts[] | {[fieldname:string]:any};
        views:{[name:string]:IFieldsetOpts}

        viewType?:ViewTypes|string;

        url?:string;
        dpath?:string;
        rows_bas_dpath?:string;
        filter_bas_dpath?:string;
        pageSize_dpath?:string;
        pageIndex_dpath?:string;
    }
 
    export class Fieldset{
        opts:IFieldsetOpts;
        private _viewOpts:{[name:string]:IInternalFieldsetOpts}
        constructor(opts:IFieldsetOpts){
            this._viewOpts={};
            this.opts = opts;
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
                if(viewOpts.viewType===undefined) throw new Error("请指定viewType");
                
                viewOpts.dpath = DPath.fetch((viewOpts.dpath as any)||"");
                if(viewOpts.filter_dpath)viewOpts.filter_dpath = DPath.fetch(viewOpts.filter_dpath as any);
                viewOpts.rows_dpath = DPath.fetch((viewOpts.rows_dpath as any)||"");
                if(viewOpts.total_dpath) viewOpts.total_dpath = DPath.fetch(viewOpts.total_dpath as any);
                if(viewOpts.pageIndex_dpath) viewOpts.pageIndex_dpath = DPath.fetch(viewOpts.pageIndex_dpath as any);
                if(viewOpts.pageSize_dpath) viewOpts.pageSize_dpath = DPath.fetch(viewOpts.pageSize_dpath as any);

                this._viewOpts[name] = viewOpts;
            }
            return new FieldsetView(viewOpts,initData,perms);
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
            let needClone = true;
            if(!is_array(viewFieldOpts)){
                fieldOpts = [];
                needClone = false;
                for(let fname in viewFieldOpts){
                    let fvalue = viewFieldOpts[fname];
                    let fOpts :IFieldOpts;
                    if(typeof fvalue==="string"){
                        if(Permissions[fvalue]!==undefined){
                            fOpts ={
                                name:fname,
                                permission:fvalue
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
                let fieldOpt = needClone ? fieldOpts[i] : deepClone(fieldOpts[i]);
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
        private opts:IInternalFieldsetOpts;
        viewType:ViewTypes;
        columns:Field[];
        
        /**
         * 各域的权限，该参数一般来自初始化后获取数据时服务器端带过来
         *
         * @type {{[fname:string]:string}}
         * @memberof FieldsetView
         */
        permissions:{[fname:string]:string};
        data:any;
        element :HTMLElement;
        views:{[name:string]:FieldView};
        rows:Array<{[name:string]:FieldView}>;
        groups:{[name:string]:IGroup};

        constructor(opts:IInternalFieldsetOpts,initData:any,perms:{[fname:string]:string}){
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
            
            switch(this.viewType){
                case ViewTypes.Detail:this._renderExpandFields(wrapper,ViewTypes.Detail);break;
                case ViewTypes.Edit:this._renderExpandFields(wrapper, ViewTypes.Edit);break;
                case ViewTypes.Query:this._renderQuery(wrapper);break;
            }

            return wrapper;
        }

        validate(isCheckRequired?:boolean):{[name:string]:ValidateMessage}{
            let rs = {};
            let count = 0;
            for(let n in this.views){
                let fv = this.views[n];
                let vs = fv.validate(isCheckRequired);
                if(vs) {rs[fv.field.name] = vs;count++;}
            }
            return count?rs:null;
        }

        _renderExpandFields(wrapper:HTMLElement,viewType:ViewTypes):HTMLElement{
            let opts = this.opts;
            let fields = opts.fields;
            let perms = this.permissions;
            let data = this.data;
            
            let groups:{[name:string]:IGroup} = {};
            let groupCount = 0;
            let btns :HTMLElement[]=[];
            
            for(let i =0,j=fields.length;i<j;i++){
                let field = fields[i];
                let perm = Permissions[perms[field.name]];
                if(perm===undefined) perm = field.permission;
                if(perm===Permissions.Denied) continue;
                if(!this.views) this.views={};
                let fview :FieldView = this.views[field.name] = new FieldView(field,this,data);
                if(fview.field.type=="button" || fview.field.type=="submit"){
                    btns.push(fview.button(fview.field.type));
                    continue;
                }
                

                let groupName = field.opts.group||"";
                let group = groups[groupName];
                
                if(!group){
                    group =  makeGroup(groupName,this);
                    groups[groupName] =group;
                    if(!group.views) group.views = {};
                    group.content.innerHTML = "";
                    //wrapper.appendChild(group.element);
                    groupCount++;
                }
                this.views[field.name]=group.views[field.name] = fview;
                fview.group = group;
                let fieldElement :HTMLElement;
                
                switch(viewType){
                    case ViewTypes.Detail:fieldElement = fview.detail();break;
                    case ViewTypes.Edit:
                        if(perm === Permissions.Readonly) fieldElement = fview.detail();
                        else fieldElement = fview.edit();
                        break;
                    case ViewTypes.Query:
                            fieldElement = fview.filter();
                        break;
                    default:throw new Error("错误的调用");
                }
                if(perm==Permissions.Hidden) fieldElement.style.display = "none";
                group.content.appendChild(fieldElement);
            }

            let form = YA.createElement("form") as HTMLFormElement;
            form.action=this.opts.url || "";

            if(viewType===ViewTypes.Query) form.method="get";
            else form.method= "post";
            form.onsubmit = (e)=>{
                e ||(e=event);
                if((form as any).__validated)return;

                let rs = this.validate(viewType!==ViewTypes.Query);
                
                if(rs){
                    let msgs ="<div>";
                    for(let n in rs) msgs += rs[n].toString(true);
                    msgs += "</div>";
                    messageBox(msgs);
                }else {
                    ajax({
                        url:this.opts.url
                        ,nocache:true
                        ,data:this.data
                    });
                }
                
                e.cancelBubble =true;
                e.returnValue=false;
                if(e.preventDefault) e.preventDefault();
                if(e.stopPropagation)e.stopPropagation();
                return false;
            };

            if(groupCount){
                if(groupCount==1){
                    for(let n in groups){
                        form.appendChild(groups[n].content);
                    }
                }else{
                    for(let n in groups){
                        form.appendChild(groups[n].element);
                    }
                }
            }else {
                this.groups=null;
            }

            if(btns.length){
                let btnDiv = YA.createElement("span");
                btnDiv.className = "btns";
                for(let i = 0,j=btns.length;i<j;i++){
                    btnDiv.appendChild(btns[i]);
                }
                form.appendChild(btnDiv);
            }
            wrapper.appendChild(form);
            return wrapper;
        }

        _renderQuery(wrapper?:HTMLElement){
            if(!wrapper) wrapper = YA.createElement("div");
            let form = YA.createElement("form");
            form.className = "filter";
            let filter = this._renderExpandFields(form,ViewTypes.Query);
            form.appendChild(filter);
            wrapper.appendChild(form);
            wrapper.appendChild(this._renderTable());
            return wrapper;
        }

        _renderTable(){
            
            let tb = YA.createElement("table");
            tb.appendChild(this._renderHead());
            tb.appendChild(this._renderBody());
            tb.appendChild(this._renderFoot());
            return tb;

        }
        _renderHead():HTMLElement{
            let opts = this.opts;
            let fields = opts.fields;
            let perms = this.permissions;
            let thead = YA.createElement("thead");
            let tr = YA.createElement("tr");thead.appendChild(tr);
            this.columns=[];
            for(let i =0,j=fields.length;i<j;i++){
                let field = fields[i];
                let perm = Permissions[perms[field.name]];
                if(perm===undefined) perm = field.permission;
                if(perm===Permissions.Denied) continue;
                let th = YA.createElement("th");
                th.innerHTML = this.TEXT(field.label||field.name);
                tr.appendChild(th);
                this.columns.push(field);
            }
            return thead;
        }

        _renderBody():HTMLElement{
            let opts = this.opts;
            let fields = opts.fields;
            let perms = this.permissions;
            let tbody = YA.createElement("tbody");
            let rows = this.rows = [];
            let columns = this.columns;
            let rowDatas = this.opts.rows_dpath? this.opts.rows_dpath.getValue(this.data): this.data;
            if(!rowDatas || rowDatas.length===0){
                let tr = YA.createElement("tr");
                let td = YA.createElement("td") as HTMLTableCellElement;tr.appendChild(td);
                td.colSpan = this.columns.length;
                td.innerHTML = this.TEXT("没有数据");

            }
            for(let i = 0,j=rowDatas.lenght;i<j;i++){
                let rowData = rowDatas[i];
                let row = {};
                let tr = YA.createElement("tr");
                for(let m = 0,n= columns.length;m<n;m++){
                    let field = columns[m];
                    let fview = row[field.name] = new FieldView(field,this,rowData);
                    let td = YA.createElement("td");
                    td.appendChild(fview.cell());tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            return tbody;
        }
        _renderFoot(){
            let tfoot = YA.createElement("tfoot");
            let tr = YA.createElement("tr");tfoot.appendChild(tr);
            let td = YA.createElement("td") as HTMLTableCellElement;tr.appendChild(td);
            td.colSpan = this.columns.length;
            if(this.opts.pageSize_dpath){
                let total = parseInt(this.opts.total_dpath.getValue(this.data))||0;
                let pageSize = parseInt(this.opts.pageSize_dpath.getValue(this.data))||5;
                let pageIndex = parseInt(this.opts.pageIndex_dpath.getValue(this.data))||1;
                
                if(pageIndex<1 ) pageIndex=1;
                let pageCount =  Math.ceil(total/pageSize);

                let scollIndex = Math.ceil(pageIndex/pageCount);
                
                let pForm = YA.createElement("form");
                if(scollIndex>1){
                    let prevScroll = YA.createElement("A");
                    prevScroll.innerHTML = "<<";
                    pForm.appendChild(prevScroll);
                }
                if(pageIndex>1){
                    let prevPage = YA.createElement("A");
                    prevPage.innerHTML = "<";
                    pForm.appendChild(prevPage);
                }

                let startPage = (pageIndex-1)*pageSize;
                if(startPage==0)startPage=1;
                let endPage = startPage + pageSize +1;
                if(endPage>pageCount) endPage = pageCount;

                for(let i=startPage;i<=endPage;i++){
                    let pageA = YA.createElement("a");
                    pageA.innerHTML = i.toString();
                    if(i==pageIndex) pageA.className = "current";
                    pForm.appendChild(pageA);
                }

                if(pageIndex<pageCount){
                    let nextPage = YA.createElement("A");
                    nextPage.innerHTML = ">";
                    pForm.appendChild(nextPage);
                }

                if(endPage<pageCount){
                    let nextScroll = YA.createElement("A");
                    nextScroll.innerHTML = ">>";
                    pForm.appendChild(nextScroll);
                }

                let logistic = YA.createElement("span");
                let totalStr = this.TEXT("共{0}条记录,每页<input type='text' value='{1}' name='pageSize' />,<input type='text' value='{2}' name='pageIndex' />/{3}页<input type='submit' value='跳转' />")
                    .replace("{0}",total.toString()).replace("{1}",pageSize.toString()).replace("{2}",pageIndex.toString()).replace("{3}",pageCount.toString());
                
                logistic.innerHTML = totalStr;

                pForm.appendChild(logistic);

                td.appendChild(pForm);
            }
            
            return tfoot;

        }


        TEXT(text:string):string{
            return text;
        }

    }
    export interface IGroup{
        name:string;
        element:HTMLElement;
        legend:HTMLElement;
        content:HTMLElement;
        views?:{[name:string]:FieldView};
    }

    export let makeGroup:(groupName:string,fsView:FieldsetView)=>IGroup = 
    function makeGroup(groupName:string,fsView:FieldsetView):IGroup{
        let gp = YA.createElement("fieldset") as HTMLFieldSetElement;
        let legend = YA.createElement("legend") as HTMLLegendElement;
        legend.innerHTML = fsView.TEXT(groupName);
        let content = YA.createElement("div") as HTMLDivElement;
        content.className= "group-content";
        gp.appendChild(legend);gp.appendChild(content);
        return {
            name:groupName
            ,element:gp
            ,legend:legend
            ,content:content
        };
        
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
        group:string;
        queryable:QueryTypes;

        componentMaker:(field:FieldView,initValue:any,editable:boolean)=>IFieldComponent;
        //dataViewCreator:(field:Field,fieldView:FieldView)=>IFieldViewAccessor;
    
        constructor(fieldOpts:IFieldOpts,fieldset?:Fieldset){
            this.opts = fieldOpts;
            this.fieldset = fieldset;
            this.type = fieldOpts.type || "text";
            this.name = fieldOpts.name;
            this.group = fieldOpts.group|| "";
            this.queryable = typeof fieldOpts.queryable==="string"?QueryTypes[fieldOpts.queryable]:fieldOpts.queryable;
            
            this.label = fieldOpts.label || this.name;
            this.validations = fieldOpts.validations || {};
            if(!this.validations[this.type]){
                let validator = validators[this.type];
                if(validator) this.validations[this.type] = true;
            }
            this.required = this.validations.required;
            this.className = "field " + this.type + " " + this.name;
            this.dpath = DPath.fetch(fieldOpts.dpath || this.name);
            this.permission = typeof fieldOpts.permission==="string"?Permissions[fieldOpts.permission]:fieldOpts.permission;
            this.componentMaker = fieldComponents[this.type] || fieldComponents["text"];

            if(this.type==="button" || this.type=="submit") this.validate =(value:any,lng:any,isc:boolean)=>undefined;
            
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

    export interface IFieldComponent{
        element:HTMLElement;
        getViewValue:()=>any;
        setViewValue:(value:any)=>any;
    }

    export class ValidateMessage{
        clientId:string;
        name:string;
        label:string;
        message:string;
        constructor(clientId:string,name:string,label:string,message){
            this.name = name;
            this.clientId = clientId;
            this.label= label;
            this.message = message;
        }
        toString(html?:boolean):string{
            if(!html) return this.message;
            let str = `<div><label for="${this.clientId}">${this.label}</label><span>${this.message}</span></div>`;
            return str;
        }

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
    fieldComponents.text = (field:FieldView,initValue:any,editable:boolean):IFieldComponent =>{
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
                field.setValue((elem as HTMLInputElement).value,"fromEvent");
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
        inputClientId:string;
        element:HTMLElement;
        getViewValue:()=>any;
        setViewValue:(val:any)=>any;
        group?:IGroup;

        constructor(field:Field,fsv:FieldsetView,data:any){
            this.field =field;
            this.fieldsetView = fsv;
            this.data = data;
        }

        setValue(val:any,arg?:string){
            this.field.dpath.setValue(this.data,val);
            if(arg==="fromEvent"){
                this.setViewValue(val);
            }
            this.validate(arg!=="notCheckRequired");
        }

        button(type:string){
            let wrapper = this.element as HTMLButtonElement;
            let field = this.field;
            if(wrapper)wrapper.innerHTML = wrapper.value="";
            wrapper = this.element = YA.createElement("button") as HTMLButtonElement;
            wrapper.type=type;
            wrapper.innerHTML = wrapper.value = this.fieldsetView.TEXT(this.field.label || this.field.name);
            this.setViewValue = (value)=> wrapper.innerHTML = wrapper.value = value;
            this.getViewValue = ()=> wrapper.value;
            this.validate = (isCheckRequired:boolean)=>undefined;
            return wrapper;
        }

        

        detail(){
            return this._detailOrEdit(false,false);
        }
        edit(requireStar?:boolean){
            return this._detailOrEdit(true,true);
        }
        filter(){
            return this._detailOrEdit(true,false);
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

            let inputComp = field.componentMaker(this,field.dpath.getValue(this.data),false);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            return wrapper;
        }

        validate(isCheckRequired:boolean):ValidateMessage{
            let value = this.getViewValue();
            let result = this.field.validate(value,(t)=>this.fieldsetView.TEXT(t),isCheckRequired);
            if(result){
                replaceClass(this.element,"validate-error","validate-success");
                return new ValidateMessage(this.inputClientId,this.field.name,this.fieldsetView.TEXT(this.field.label|| this.field.name),result);
            }else {
                replaceClass(this.element,"validate-success","validate-error");
            }
            //return result;
        }

        _detailOrEdit(editable:boolean,requireStar:boolean){
            let fieldWrapper = this.element;
            let field = this.field;
            if(fieldWrapper)fieldWrapper.innerHTML="";
            fieldWrapper = this.element = YA.createElement("div");

            fieldWrapper.className = field.className;
            fieldWrapper.appendChild(this._label(field,requireStar));

            let inputComp = field.componentMaker(this,field.dpath.getValue(this.data),editable);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            if(field.opts.remark)fieldWrapper.appendChild(this._remark(field));
            return fieldWrapper;
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

    function messageBox(msg):IThenable<any>{
        return new Awaitor((ok,fail)=>{
            alert(msg);
            ok(true);
        });
    }
}