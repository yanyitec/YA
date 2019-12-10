declare let Reflect;

namespace YA{
    // 正则:去掉字符串首尾空白字符
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;

    

    //if(!Object.defineProperty) Object.defineProperty=(o,n,d)=>o[n]=d?d.value:undefined;
    let defPropsValue =(obj:object,propNames:string[],desc:PropertyDescriptor):void=>{
        for(const i in propNames) Object.defineProperty(obj,propNames[i],desc);
    };
    export class Exception extends Error{
        internal_error:Error;
        extra:any;
        constructor(message:string,internalError?:any,extra?:any){
            super(message);
            if(extra===undefined){
                if(internalError instanceof Error){
                    this.internal_error= internalError;
                    
                }else{
                    this.extra = internalError;
                }
            }else{
                this.internal_error = internalError;
                this.extra = extra;
            }
            
            
        }
    }
    export function is_array(obj:any){
        if(!obj)return false;
        return Object.prototype.toString.call(obj)==="[object Array]";
    }

    

    export function interceptable() {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            let method:any = descriptor.value;

            if(typeof method!=='function') throw new Exception("interceptable 只可用于方法");
            descriptor.configurable=false;
            descriptor.enumerable=false;
            
            let intercept = function(interceptor:Function):Function{
                let mymethod = this;
                let wrapMethod:any = target[propertyKey] = function(...args:any[]){
                    args.unshift(mymethod);
                    return interceptor.apply(this,args);
                };
                wrapMethod.intercept = intercept;

                return wrapMethod;
            }
            method.intercept = intercept;
        };
    }
    let makeIntercept = interceptable();
    
    
    (Function.prototype as any).intercept = function(interceptor){
        let  method = this;
        return function(...args:any[]){
            args.unshift(method);
            return interceptor.apply(this,args);
        };
    }

    

    export interface IThenable<T>{
        then(onfullfilled?:(value:T)=>void,onReject?:(value:any)=>void):IThenable<T>
    }

    export interface ICompletable{
        complete(onComplete:Function):ICompletable;
    }

    export enum AwaitorStates{
        padding=0,
        fulfilled=1,
        rejected=-1
    }

    export enum AwaitorTypes{
        awaitor,
        deferrer
    }

    
    /**
     * 简单的异步对象
     *
     * @export
     * @class Awaitor<T>
     */
    export class Awaitor<T>{
        awaitor_status : AwaitorStates;
        awaitor_value:any;
        awaitor_type:AwaitorTypes;
        
        
        success:(onfulfilled:(value:any)=>void)=>Awaitor<T>;
        ok:(onfulfilled:(value:any)=>void)=>Awaitor<T>;
        error:(onrejected:(value:any)=>void)=>Awaitor<T>;
        
        catch:(onrejected:(value:any)=>void)=>Awaitor<T>;
        
        resolve:(value:any)=>void;
        reject:(err:any)=>void;

        private _fulfillCallbacks:{(value:any):void}[];
        private _rejectCallbacks:{(value:any):void}[];


        constructor(asyncProcess?:{(fulfill:(value:any)=>void,reject:(err:any)=>void):void},resolveByApply?:boolean){ 
            this.awaitor_status= AwaitorStates.padding;
            this.awaitor_type = asyncProcess? AwaitorTypes.awaitor:AwaitorTypes.deferrer;

            let internalRresolve = (value:any):Awaitor<T>=>{  
                let fulfills = this._fulfillCallbacks;
                this.awaitor_value  = value;
                this.awaitor_status  = AwaitorStates.fulfilled;
                this._fulfillCallbacks = this._rejectCallbacks=undefined;

                this.awaitor_status=AwaitorStates.fulfilled;

                if(fulfills && fulfills.length){
                    setTimeout(()=>{for(const i in fulfills) fulfills[i](value);},0);
                }
                internalRresolve= resolve= reject = (value:any):Awaitor<T>=>this;
                return this;
            };
            let resolve = (value:any):Awaitor<T>=>{
                if(value===this) throw new TypeError("循环引用");
                if(this.awaitor_status!==AwaitorStates.padding) {
                    console.warn("非Padding状态的Awaitor，反复调用了resolve函数");
                    return this;
                }
                if(value && value.then &&(typeof value.then==="function")){
                    value.then(internalRresolve,reject);
                }else internalRresolve(value);
                return this;
            };
            
            let reject = (value:any):Awaitor<T>=>{
                if(this.awaitor_status!==AwaitorStates.padding) {
                    console.warn("非Padding状态的Awaitor，反复调用了reject函数");
                    return this;
                }
                let rejects = this._rejectCallbacks;
                this.awaitor_value = value;this.awaitor_status= AwaitorStates.rejected;
                this._fulfillCallbacks = this._rejectCallbacks=undefined;
                
                if(rejects && rejects.length){
                    setTimeout(()=>{  for(const i in rejects) rejects[i](value);},0);
                }
                return this;
            }; 

            this.success = this.ok = this.done;
            this.error = this.catch = this.fail;

            if(asyncProcess){
                this.resolve = this.reject = (val:any):AwaitorStates=>{throw new Error(`不是deferrer对象，不允许调用resolve/reject函数.`);};
                setTimeout(() => {
                    try{
                        (<{(fulfill:(value:any)=>void,reject:(err:any)=>void):void}>asyncProcess)(resolve,reject);
                    }catch(ex){
                        this.reject(ex);
                    }
                }, 0);
            }else{
                this.resolve = resolve;
                this.reject = reject;
            }
        }

        then(onfulfilled:(value:any)=>void,onrejected:(err:any)=>void):Awaitor<T>{
            if(this.awaitor_status == AwaitorStates.padding){
                if(onfulfilled)(this._fulfillCallbacks||(this._fulfillCallbacks=[])).push(onfulfilled);
                if(onrejected) (this._rejectCallbacks||(this._rejectCallbacks=[])).push(onrejected);
            }else if(this.awaitor_status == AwaitorStates.fulfilled){
                if(onfulfilled)setTimeout(()=>onfulfilled(this.awaitor_value));
            }else if(this.awaitor_status==AwaitorStates.rejected){
                if(onrejected)setTimeout(()=>onrejected(this.awaitor_value));
            }
            return this;
        }

        done(onfulfilled:(value:any)=>void):Awaitor<T>{
            if(!onfulfilled)return this;
            if(this.awaitor_status===AwaitorStates.padding){
                (this._fulfillCallbacks||(this._fulfillCallbacks=[])).push(onfulfilled);
            }else if(this.awaitor_status===AwaitorStates.fulfilled){
                setTimeout(()=>onfulfilled(this.awaitor_value));
            }
            return this;
        }
        fail(onrejected:(value:any)=>void):Awaitor<T>{
            if(!onrejected)return this;
            if(this.awaitor_status===AwaitorStates.padding){
                (this._rejectCallbacks||(this._rejectCallbacks=[])).push(onrejected);
            }else if(this.awaitor_status===AwaitorStates.rejected){
                setTimeout(()=>onrejected(this.awaitor_value));
            }
            return this;
        }

        complete(oncomplete:Function):Awaitor<T>{
            if(!oncomplete)return this;
            if(this.awaitor_status===AwaitorStates.padding){
                (this._fulfillCallbacks||(this._fulfillCallbacks=[])).push((arg:any)=>{
                    if(is_array(arg)) oncomplete.apply(this,arg);
                    else oncomplete.call(this,arg);
                });
            }else if(this.awaitor_status===AwaitorStates.fulfilled){
                if(is_array(this.awaitor_value))setTimeout(()=>oncomplete.apply(this,this.awaitor_value),0);
                else setTimeout(()=>oncomplete.call(this,this.awaitor_value),0);
            }
            return this;       
        }

        static all(_awators:IThenable<any>[]):Awaitor<any>{
            let awaitors = is_array(_awators)?_awators:arguments;
            return new Awaitor<any>((resolve,reject)=>{
                let rs :any[]=[];
                let total = awaitors.length;
                let count = total;
                let hasError=false;
                for(let i =0,j=total;i<j;i++){
                    ((index:number)=>{
                        let awaitObj:IThenable<any> = awaitors[index];
                        awaitObj.then((value)=>{
                            if(hasError) return;
                            rs[index]=value;
                            if(--count==0) resolve(rs);
                        },err=>{
                            if(hasError) return;
                            hasError=true;
                            let ex = new Exception(`index=${index}的Thenable错误导致all函数错误:${err.message}`,err);
                            reject(ex);
                        });
                    })(i);
                }
                if(count==0 && !hasError) resolve(rs);
            });
        }
        static race(_awators:IThenable<any>[]):Awaitor<any>{
            let awaitors = is_array(_awators)?_awators:arguments;
            return new Awaitor<any>((resolve,reject)=>{
                let hasResult = false;
                for(let i =0,j=awaitors.length;i<j;i++){
                    ((index:number)=>{
                        let awaitObj:IThenable<any> = awaitors[index];
                        awaitObj.then((value)=>{
                            if(hasResult)return;
                            hasResult =true;
                            resolve(value);
                        },err=>{
                            if(hasResult)return;
                            hasResult =true;
                            reject(err);
                        });
                    })(i);
                }
            });
        }
        static resolve(value?:any):Awaitor<any>{
            return new Awaitor<any>((resolve)=>resolve(value));
        }

        static reject(err?:any):Awaitor<any>{
            return new Awaitor<any>((resolve,reject)=>reject(err));
        }
        
    }
    try{
        if(!(window as any).Promise) (window as any).Promise = Awaitor;
    }catch{}

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
    let lastRegx :RegExp = /^-\d+$/;
    export class DPath{
        
        //fromRoot:boolean;
        constructor(pathOrValue:any,type?:string){
            if(type==="const"){
                this.getValue = (d)=>pathOrValue;
                this.setValue = (d,v)=>{
                    console.warn("向一个const的DPath写入了值",this,d,v);
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
                    //if(txt==="$") this.fromRoot = true;
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
    DPaths[""] = {
        getValue:(data:any)=>data,
        setValue:(data:any,value:any)=>{}
    };


    let branceRegx = /\{([^\}]+)\}/gi;
    
    /**
     * a={dd}&b={d.s({a,b})}
     *
     * @export
     * @class StringTemplate
     */
    export class StringTemplate{
        dpaths:any[];
        text:string;
        constructor(template:string){
            this.text = template;
            let match;
            let lastAt =0;
            while(match = branceRegx.exec(template)){
                
                let at = match.index;
                let text = template.substring(lastAt,at);
                if(text)this.dpaths.push(text);
                at++;
                let len = match.length;
                let pathtext = template.substr(at,len);
                let dpath = DPath.fetch(pathtext);
                this.dpaths.push(dpath);
                lastAt=at+ len+1;
            }
            let text = template.substring(lastAt);
            if(text)this.dpaths.push(text);
        }
        replace(data:any){
            let rs ="";
            for(let i in this.dpaths){
                let dp = this.dpaths[i];
                if(dp.getValue) rs += dp.getValue(data);
                else rs += dp;
            }
            return rs;
        }
        static replace(template:string,data?:any){
            let tmpl = StringTemplate.caches[template]||(StringTemplate.caches[template]=new StringTemplate(template));
            return tmpl.replace(data);
        }
        static caches :{[key:string]:StringTemplate}={};
    }

    
    

    /**
     * 资源/模块状态
     *
     * @export
     * @enum {number}
     */
    export enum ResourceStates {

        /**
         * 被请求
         */
        required=0,

        /**
         * 正在从 网站/本地或其他资源地址加载，但尚未完全返回。
         */
        loading=1,

        /**
         * 已经从资源地址中载入，还在处理依赖关系
         */
        waiting=2,

        /**
         * 所有依赖项已加载完成，但模块还在初始化中
         */
        initializing=3,

        /**
         * 模块已经完全载入，包括依赖项与内置资源
         */
        completed=4,
        error = -1
    }

    export interface IResourceOpts{
        url:string;
        type?:string;
    }

    /**
     * 可单独载入的js/css等资源
     *
     * @export
     * @interface IResource
     */
    export interface IResource extends IThenable<any>,ICompletable{

        /**
         * 资源的唯一编号
         *
         * @type {string}
         * @memberof IResource
         */
        id:string;
        
        /**
         * 资源的Url
         *
         * @type {string}
         * @memberof IResource
         */
        url:string;

        /**
         * 资源类型
         *
         * @type {string}
         * @memberof IResource
         */
        type:string;

        /**
         * 资源在网页中占据的元素
         *
         * @type {*}
         * @memberof IResource
         */
        element:any;

        /**
         * 资源状态
         *
         * @type {ResourceStates}
         * @memberof IResource
         */
        status:ResourceStates;


        /**
         * state变化的原因
         *
         * @type {*}
         * @memberof IResource
         */
        reason:any;
        
        
        /**
         * 添加或删除模块状态监听函数
         * 如果返回false，则会从监听中把自己去掉。
         *
         * @param {(boolean|{(res:IResource):void})} addOrRemove
         * @param {(res:IResource)=>void} [callback]
         * @returns {IResource}
         * @memberof IResource
         */
        statechange(addOrRemove:boolean|{(res:IResource):void},callback?:(res:IResource)=>void):IResource;
    }

    export class Resource extends Awaitor<any> implements IResource{
        /**
         * 资源的唯一编号
         *
         * @type {string}
         * @memberof IResource
         */
        id:string;
        
        /**
         * 资源的Url
         *
         * @type {string}
         * @memberof IResource
         */
        url:string;

        /**
         * 资源类型
         *
         * @type {string}
         * @memberof IResource
         */
        type:string;

        /**
         * 资源在网页中占据的元素
         *
         * @type {*}
         * @memberof IResource
         */
        element:any;
        /**
         * state变化的原因
         *
         * @type {*}
         * @memberof IResource
         */
        reason:any;

        /**
         * 资源状态
         *
         * @type {ResourceStates}
         * @memberof IResource
         */
        status:ResourceStates;

        request_id:string;

        private _resolve:(value:any)=>void;
        private _reject:(err:any)=>void;
        protected _statechangeCallbacks:{(res:IResource):void}[];
        

        constructor(opts:IResourceOpts){
            if(opts.url==="%__LOCALVALUE__%"){  return; }
            super((resolve,reject)=>{
                this._resolve = resolve;
                this._reject= reject;
                this._load();
            });
            let url = opts.url.replace(/(^\s+)|(\s+$)/gi,"");
            if(!url) throw new Error("未指定资源的URL.");
            this.id = url;
            this.type = opts.type || "js";
            this.url = this._makeUrl(url);
            
        }
        
        /**
         * 添加或删除模块状态监听函数
         * 如果返回false，则会从监听中把自己去掉。
         *
         * @param {(boolean|{(res:IResource):void})} addOrRemove
         * @param {(res:IResource)=>void} [callback]
         * @memberof IResource
         */
        statechange(addOrRemove:boolean|{(res:IResource):void},callback?:(res:IResource)=>void):IResource{
            if(this.status==ResourceStates.completed ||this.status==ResourceStates.error){
                return this;
            }

            if(callback===undefined) callback = addOrRemove as (res:IResource)=>any;
            if(addOrRemove===false){
                for(let i=0,j=this._statechangeCallbacks.length;i<j;i++){
                    let existed = this._statechangeCallbacks.shift();
                    if(existed!==callback) this._statechangeCallbacks.push(existed);
                }
                return this;
            }else{ 
                (this._statechangeCallbacks|| (this._statechangeCallbacks=[])).push(callback);
                return this;
            }
        }

        protected _makeUrl(url:string){
            let ext = "." +this.type;
            if(url.lastIndexOf(ext)<0) url+= ext;            
            return url;
        }

        _changeState(status:ResourceStates,reason?:any):IResource{
            if(this.status===ResourceStates.error || this.status===ResourceStates.completed){
                throw new Error(`当前资源已经处于${ResourceStates[this.status]}，不能变更状态`);
            }
            
            if(status!=ResourceStates.error && status<this.status){
                throw new Error(`状态不能从${ResourceStates[this.status]}变更为${ResourceStates[status]}`);
            }
            this.status=status;
            this.reason = reason;
            if(this._statechangeCallbacks){
                for(let i =0,j= this._statechangeCallbacks.length;i<j;i++){
                    this._statechangeCallbacks[i](this);
                }
            }


            if(this.status===ResourceStates.error || this.status===ResourceStates.completed){
                if(this.status == ResourceStates.completed)this._resolve(reason);
                else this._reject(reason);
                
                this._statechangeCallbacks=undefined;
                this.statechange =(addOrRemove:boolean|{(res:IResource):void},callback?:(res:IResource)=>void):IResource=>{
                    console.warn("向已经完成或错误的资源追加状态监听函数");
                    return this;
                };
            }
            return this;
        }

        protected _load(){
            this._changeState(ResourceStates.loading);
            this.element = this._doLoad(
                ()=>this._changeState(ResourceStates.completed),
                (ex)=>this._changeState(ResourceStates.error,ex)
            );
        }

        protected _doLoad(okCallback:(value:any)=>void,errCallback:(err:any)=>void):any{
            let script = document.createElement("script") as HTMLScriptElement;
            script.type = "text/javascript";
            let reqId = this.request_id = Math.random().toPrecision(21);
            let url = this.url;
            if(url.indexOf("?")>0) url += "&_=" + reqId;
            else url += "?_=" + reqId;
            script.src = url;
            this._attatchEvents(script,okCallback,errCallback);
            this._getResourceElementContainer().appendChild(script);
            return script;
        }

        protected _attatchEvents(elem:any,okCallback,errCallback){
            elem.onerror = (e)=>{if(errCallback) errCallback(e);};
            if(elem.onreadystatechange!==undefined){
                elem.onreadystatechange =()=>{
                    if(elem.readyState==4 || elem.readyState=="complete") {if(okCallback) okCallback(this);}
                };
            }else{
                elem.onload=()=>{if(okCallback) okCallback(this);};
            }
        }

        protected _getResourceElementContainer():any{
            let heads = document.getElementsByTagName("head");
            let head;
            if(heads.length) {
                head = heads[0];
                this._getResourceElementContainer=()=>head;
                return head;
            }
            else return document.body;
            
        }

    }

    export class StylesheetResource extends Resource{
        constructor(opts:IResourceOpts){
            super(opts);
        }
        protected _doLoad(okCallback,errCallback){
            let elem = document.createElement("link") as HTMLLinkElement;
            elem.type = "text/css";elem.rel="stylesheet";
            let reqId = this.request_id = Math.random().toPrecision(21);
            let url = this.url;
            if(url.indexOf("?")>0) url += "&_=" + reqId;
            else url += "?_=" + reqId;
            elem.href = url;
            this._attatchEvents(elem,okCallback,errCallback);
            this._getResourceElementContainer().appendChild(elem);
            return elem;
        }
    }

    export function makeUrl(url:string):string{
        return url;
    }
    

    

    
    export interface IDefineParams {
        
        dependences?:string[];
        defination?:Function;
        content?:any;
    }

    /**
     * 带着依赖项的资源
     *
     * @export
     * @interface IModule
     */
    export interface IModule extends IResource{

        /**
         * 模块内容，模块加载产生内容。
         *
         * @type {*}
         * @memberof IModule
         */
        content:any;

        /**
         * 该模块的依赖项
         *
         * @type {IModule[]}
         * @memberof IModule
         */
        dependences:IResource[];
    }

    export class Module extends Resource implements IModule{
        /**
         * 模块内容，模块加载产生内容。
         *
         * @type {*}
         * @memberof IModule
         */
        content:any;

        /**
         * 该模块的依赖项
         *
         * @type {IModule[]}
         * @memberof IModule
         */
        dependences:IResource[];

        _waitingDepsModuleList?:IModule[];
        constructor(opts:IResourceOpts,waitingDepsModuleList?:IModule[]){
            super(opts);
            this.dependences=[];
            //"等待依赖项的模块列表"，用这个变量来监测循环依赖，如果某个模块的依赖项出现在该列表中，就表示需要加载等待中的模块，就是循环引用
            this._waitingDepsModuleList = waitingDepsModuleList;
        }

        

        _load(){
            this._changeState(ResourceStates.loading);
            this.element = this._doLoad(()=>this._srcLoaded(),(ex)=>this._changeState(ResourceStates.error,ex));
        }

        protected _tryChangeState(status:ResourceStates,reason?:any):IModule{
            
            
            if(this.status===ResourceStates.error || this.status===ResourceStates.completed){
                return this;
            } else {
                this._changeState(status,reason);
                return this;
            }
        }

        _srcLoaded(){
            this._changeState(ResourceStates.waiting);
            let defParams = currentDefineParams;
            currentDefineParams = undefined;
            if(defParams===undefined) return this;
            let depCount = defParams.dependences?defParams.dependences.length:0;
            let depReadyCount = 0;
            let depValues:any[]=[];
            let hasError = false;
            if(depCount>0 && this._waitingDepsModuleList)this._waitingDepsModuleList.push(this);
            for(const i in defParams.dependences){
                ((index)=>{
                    let depModule = getModule(defParams.dependences[index],this._waitingDepsModuleList);
                    this.dependences[index] = depModule;
                    depModule.then((value:any)=>{
                        if(hasError)return;
                        depValues[index]=value;
                        depReadyCount++;
                        if(depReadyCount==depCount) this._depsReady(defParams.defination,depValues);
                    },(err)=>{
                        if(hasError)return;
                        hasError = true;
                        let ex = new Exception(`模块[${this.id}]的依赖项[${defParams.dependences[index]}->${depModule.id}]无法加载:${err.message}`,err);
                        this._tryChangeState(ResourceStates.error,ex);
                        
                    });
                })(i);
                
            }
            if(depReadyCount==depCount && !hasError) this._depsReady(defParams.defination,depValues);
        }

        

        private _depsReady(definer:Function,depValues:any[]){
            this._removeMeFroWaitingDepModuleList();
            let rs = definer.apply({
                //await:(fn)=>this.await(fn),
                id:this.id,
                url:this.url
            },depValues);
            if(rs && rs["#__REQUIRE_NOT_COMPLETE__#"]){
                this._tryChangeState(ResourceStates.initializing,rs);
                (rs as IThenable<any>).then((value)=>this._tryChangeState(ResourceStates.completed,value),(err)=>this._tryChangeState(ResourceStates.error,err));
            }else{
                this._tryChangeState(ResourceStates.completed,rs);
            }
        }
        
        /**
         * 把自己从“等待依赖项的模块列表”中移除
         *
         * @private
         * @memberof Module
         */
        private _removeMeFroWaitingDepModuleList(){
            //加载的时候才会进入到这个if里面去
            //加载完成，把自己从正在加载的模块列表中移除
            if(this._waitingDepsModuleList){
                for(let i=0,j=this._waitingDepsModuleList.length;i<j;i++){
                    let exist = this._waitingDepsModuleList.shift();
                    if(exist!==this) this._waitingDepsModuleList.push(exist);
                }
                //当前模块不再引用“正在等待的模块列表”，可能其他模块还在引用
                this._waitingDepsModuleList=undefined;
            }
        }
    }


    export let cachedModules :{[id:string]:Module} = {};


    /**
     * 从缓存中获取模块，如果没有就新建一个并加到缓存中
     *
     * @param {string} url
     * @returns
     */
    function getModule(url:string,waitingModules?:IModule[]){
        let cached = cachedModules[url];
        if(cached) return cached;
        return cached = cachedModules[url] = new Module({url:url,type:"js"},waitingModules);
    }

    

    let currentDefineParams :IDefineParams;
    let emptyArray:any[]=[];

    export function define(depNames:string|string[]|Function,definer:Function|any):void{
        if(definer===undefined && typeof depNames==="function"){
            definer= depNames as Function;
            depNames=emptyArray;
        }
        currentDefineParams = {dependences:depNames as string[],defination:definer};

    }
    (define as any).amd=true;

    try{
        (window as any).define=define;
    }catch{}

    export function require(depNames:string[]|string):ICompletable{
        let t = typeof depNames;
        let deps:IThenable<any>[];
        let isArrayCall = is_array(depNames);
        if(!isArrayCall){
            depNames = arguments as any as string[];
        }
        deps=[];
        for(let i=0,j=depNames.length;i<j;i++){
            deps.push(getModule(depNames[i]));
        }
        
        let ret =Awaitor.all(deps);
        //(ret as any).complete 
        return ret;
    }

    (require as any).await = function(asyncProcess?:(value:any)=>void){
        let awaitor:any = new Awaitor<any>(asyncProcess);
        awaitor["#__REQUIRE_NOT_COMPLETE__#"] = true;
        return awaitor;
    }
    
    interface IResolveRule{
        partten:RegExp,
        replacement:string;
    }

    let urlResolveRules :{[name:string]:IResolveRule}={};

    export function resolveUrl(url:string,data?:any):any{
        url = data?StringTemplate.replace(url,data):url;
        for(let name in urlResolveRules){
            let rule = urlResolveRules[name];
            let newUrl = url.replace(rule.partten,rule.replacement);
            if(newUrl!==url){
                url = newUrl;break;
            }
        }
        return url;
    }

    
    (resolveUrl as any).config = function(rules:{[partten:string]:string}){
        for(let name in rules){
            let rule:IResolveRule = {
                partten:new RegExp(name),
                replacement:rules[name]
            };
            urlResolveRules[name]=rule;
        }
    }
}