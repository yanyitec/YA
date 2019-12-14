declare let Reflect;

namespace YA{
    // 正则:去掉字符串首尾空白字符
    export let trimRegx :RegExp = /(^\s+)|(\s+$)/gi;

    

   
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


    // s | toJson
    //this == input, return = output 
    //new Pipeline().pipe(function(){}).pipe().attatch
    interface IPipeItem{
        command:Function;
        args:any[];
    }

    /**
     * 管道
     *
     * @export
     * @class Pipe
     */
    export class Pipe{
        private _pipes:IPipeItem[];
        constructor(){
            if(arguments.length){
                this._pipes = [];
                for(let i =0,j=arguments.length;i<j;i++){
                    this._pipes.push({
                        command:arguments[i],args:null
                    });
                }
            }
        }
        pipe(args:any[]|Function,command?:Function):Pipe{
            if(typeof args ==="function"){
                command =args as Function;
                args = undefined;
            }
            (this._pipes||(this._pipes=[])).push({
                command :command,
                args:args as any[]
            });
            return this;
        }
        removePipe(args:any[]|Function,command?:Function){
            if(typeof args ==="function"){
                command =args as Function;
                args = undefined;
            }
            let items = this._pipes;
           
            for(let i in items){
                let item = items.shift();
                if(item.command!==command || item.args!=args){
                    items.push(item);
                }
            }
            return this;
        }
        execute(input:any,self?:any):any{
            let items = this._pipes;
            self|| (self=this);
            for(let i in items){
                let item = items[i];
                let args = item.args||[];
                args.unshift(input);
                input = item.command.apply(self,args);
                args.shift();
            }
            return input;
        }
        bind(first:Function):Function{
            let me = this;
            let result:any= function(){
                return me.execute(first.apply(this,arguments),this);
            }
            result.$pipe = this;
            return result;
        }
    }

    /**
     * 拦截器/装饰器
     *
     * @export
     * @class Interceptor
     */
    export class Interceptor{
        raw:Function;
        func:Function;
        private _next:(args:any[])=>any;
        constructor(method?:Function){
            
            if(method && typeof method !=='function') throw new Exception("拦截器必须应用于函数");
            this.raw = method;
            let me = this;
            let first = this._next = method?function(args:any[]){
                method.apply(this,args);
            }:function(){};
            
            let result:any= function(...args:any[]){
                if(me._next===first) {
                    return method.apply(this,arguments);
                }else{
                    return me._next.call(this,args);
                }
                //return me.next===first?method.apply():me._next.call(this,args);
            };
            result.intercept =function(interceptor:Function){
                me.intercept(interceptor);
                return this;
            };
            result.$interceptor = this;
            this.func = result;
        }
        intercept(interceptor:Function):Interceptor{
            let inner = this._next;
            this._next = function(args:any[]){ 
                args.unshift(inner);
                return interceptor.apply(this,args);
            }
            return this;
        }
        execute(me:any,args:any[]){
            return this.func.apply(me,args);
        }
        

    }
    
    export function interceptable() {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            descriptor.value = new Interceptor(descriptor.value);
        };
    }

    export interface IObservable{
        subscribe(listener:Function):IObservable;
        unsubscribe(listener?:Function):IObservable;
        publish(...args:any[]):IObservable;
    }


    /**
     * 发布/订阅
     *
     * @export
     * @class Observable
     * @implements {IObservable}
     */
    export class Observable implements IObservable{
        $subscribers:Function[];
        subscribe(observer:Function):IObservable{
            (this.$subscribers||(this.$subscribers=[])).push(observer);
            return this;
        }
        unsubscribe(observer?:Function):IObservable{
            if(!this.$subscribers) return this;
            for(let i =0,j=this.$subscribers.length;i<j;i++){
                let existed = this.$subscribers.shift();
                if(observer===existed) continue;
                this.$subscribers.push(existed);
            }
            return this;
        }
        publish(...args:any[]):IObservable{
            if(!this.$subscribers) return this;
            for(let i =0,j=this.$subscribers.length;i<j;i++){
                let existed = this.$subscribers[i];
                existed.apply(this,arguments);
            }
            return this;
        }
        constructor(target?:any){
            if(target){
                target.subscribe = this.subscribe;
                target.unsubscribe = this.unsubscribe;
                target.publish = this.publish;
            }
        }
    }
    export interface IEventable{
        attachEvent(eventId:string,listener:Function,extras?:any):IEventable;
        detechEvent(eventId:string,listener,Function,extras?:any);
        dispachEvent(eventId:string,evtArg:any,extras?:any);
    }
    
    export interface IEventArgs{
        eventId?:string;
        extras?:any;
        sender?:IEventable;
    }
    interface EventListener{
        listener:(evtArgs:IEventArgs)=>any;
        extras?:any;
    }

    /**
     * 事件
     *
     * @export
     * @class Eventable
     * @implements {IEventable}
     */
    export class Eventable implements IEventable{
        protected _events:{[eventId:string]:EventListener[]};
        attachEvent(eventId:string,listener:(evtArgs:IEventArgs)=>any,extras?:any):IEventable{
            let events = this._events ||(this._events={});
            let listeners = events[eventId]||(events[eventId]=[]);
            listeners.push({ listener:listener,extras:extras});
            return this;
        }
        detechEvent(eventId:string,listener:(evtArgs:IEventArgs)=>any,extras?:any):IEventable{
            let events = this._events;if(!events)return this;
            let listeners = events[eventId];if(!listeners) return this;
            for(let i =0,j=listeners.length;i<j;i++){
                let existed = listeners.shift();
                if(existed.listener===listener && existed.extras===extras) continue;
                listeners.push(existed);
            }
            if(listeners.length==0) delete events[eventId];
            return this;
        }
        dispachEvent(eventId:string,evtArgs:IEventArgs,extras?:any):IEventable{
            let events = this._events;if(!events)return this;
            let listeners = events[eventId];if(!listeners) return this;
            evtArgs||(evtArgs={});
            evtArgs.eventId=eventId;
            evtArgs.sender = this;
            for(let i =0,j=listeners.length;i<j;i++){
                let existed = listeners[i];
                if(existed.extras===extras)existed.listener(evtArgs);
            }
            return this;
        }

        constructor(target?:any){
           if(target){
               target.attachEvent = this.attachEvent;
               target.detechEvent = this.detechEvent;
               target.dispachEvent = this.dispachEvent;
           } 
        }
    }
    
    export class Proxy{
        constructor(target:object,methods?:string[],proxy?:any){
            proxy ||(proxy===this);
            let makeProxyMethod = (name)=>{
                let method = target[name];
                if(typeof method!=='function') return;
                proxy[name]=function(){return method.apply(target,arguments);}
            };
            if(methods){
                for(let i in methods){
                    makeProxyMethod(methods[i]);
                }
            }else{
                for(let n in target){
                    makeProxyMethod(n);
                }
            }
        }

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
        replace(data:any,convertor?:(input:string)=>string){
            let rs ="";
            for(let i in this.dpaths){
                let dp = this.dpaths[i];
                if(dp.getValue){
                    let val= dp.getValue(data);
                    if(convertor) val = convertor(val);
                    if(val!==null && val!==undefined){
                        rs += val;
                    }
                } 
                else rs += dp;
            }
            return rs;
        }
        static replace(template:string,data?:any,convertor?:(t:string)=>string){
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
        url = data?StringTemplate.replace(url,data,(t)=>encodeURIComponent(t)):url;
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

    export interface IAjaxOpts{
        method?:string;
        url:string;
        data?:any;
        type?:string;
        dataType?:string;
        cache?:boolean;
        sync?:boolean;
        headers?:{[name:string]:string};
    }
    export interface IAjaxInterceptors{
        request:Interceptor;
        response:Interceptor;
    };
    export class AjaxException extends Exception{
        status:number;
        statusText:string;
        instance:Ajax<any>;
        constructor(instance:Ajax<any>){
            super(instance.http.statusText);
            this.instance= instance;
            this.status = instance.http.status;
            this.statusText = instance.http.statusText;
            this.message = `网络请求或服务器异常(${this.status})`;
        }
    }
    export class Ajax<T> extends Awaitor<T>{
        opts:IAjaxOpts;
        url:string;
        method:string;
        data:any;
        http:XMLHttpRequest;
        
        requestHeaders:{[name:string]:string};
        constructor(opts:IAjaxOpts){
            super((resolve:(value:any)=>void,reject:(error:any)=>void)=>{
                let http = this._init_http(opts,resolve,reject);
            
                let sendDataType =typeof opts.data;
                
                let method = this.method = (opts.method || "GET").toUpperCase(); 
                let sendData = this._init_sendData(opts,sendDataType,method);

                let url = resolveUrl(opts.url,sendDataType=="object"?opts.data:undefined);
                let hasQuest = (url.indexOf("?")>=0) ;
                if(method!=="POST" && method!=="PUT"){
                    if(sendData){
                        if(hasQuest) url += "&" +sendData;
                        else{ url += "?"+sendData;hasQuest=true;}
                    }
                    
                    if(!opts.cache){
                        if(hasQuest) url += "&_"+Math.random();
                        else url += "?_"+Math.random();
                    }
                    this.data=null;
                }else {
                    this.data = sendData;

                }
                this.url = url;

                this.requestHeaders = opts.headers||{};
                
                Ajax.interceptors.request.execute(this,[http]);
                http.open(this.method,this.url,true);  
                
                this._init_headers(this.requestHeaders,http,opts.type,method);
                http.send(this.data);
            });
            this.opts= opts;
        }
        private _init_http(opts:IAjaxOpts,resolve:(value:any)=>void,reject:(error:any)=>void){
            let http:XMLHttpRequest;
            if((window as any).XMLHttpRequest)  //非IE
                http = new XMLHttpRequest();
            else {
                let ActiveObject:any = (window as any).ActiveObject;
                if(ActiveObject){
                    http = new ActiveObject("Msxml2.XMLHTTP");
                }else {
                    http = new ActiveObject("Microsoft.XMLHTTP");
                }
            }
            this._init_http_event(http,opts,resolve,reject);
            return http;
        }
        private _init_http_event(http:XMLHttpRequest,opts:IAjaxOpts,resolve:(value:any)=>void,reject:(error:any)=>void){
            if(http.onreadystatechange!==undefined){
                http.onreadystatechange=()=>{
                    if(http.readyState==4 || (http.readyState as any)=="complete"){
                        Ajax.interceptors.response.execute(this,[resolve,reject]);
                    }
                };
            }else {
                http.onload = ()=>Ajax.interceptors.response.execute(this,[resolve,reject]);;
            }
            http.onerror=(ex)=>{
                console.error(ex);
                reject(ex);
            }
        }
        private _init_sendData(opts:IAjaxOpts,sendDataType:string,method){
            let sendData = opts.data;
            if(sendData){
                let sendDataNeedEncode=false;
                if(method==="POST" || method==="PUT"){
                    if(sendDataType==="object"){
                        if(opts.type==="json"){
                            sendData= JSON.stringify(sendData);
                        }else{
                            sendDataNeedEncode=true;
                        }
                    }
                }else{sendDataNeedEncode=true;}
                if(sendDataNeedEncode){
                    let sendStr = "";
                    for(let n in sendData){
                        if(sendStr)sendStr += "&";
                        sendStr += encodeURIComponent(n);
                        sendStr += "=";
                        let sendValue = sendData[n];
                        if(sendValue!==null&& sendValue==undefined){
                            sendStr += encodeURIComponent(sendValue);
                        }
                        
                    }
                    sendData = sendStr;
                }
            }
            return sendData;
        }
        private _init_headers(headers:{[name:string]:string},http:XMLHttpRequest,type:string,method:string){
            let contentType :string;
            if(type==="json"){
                contentType = "text/json";
            }else if(type==="xml"){
                contentType = "text/json";
            }else if(method=="POST" || method=="PUT"){
                contentType = "application/x-www-form-urlencode";
            }
            http.setRequestHeader("Content-Type",contentType);
            if(headers){
                for(let name in headers){
                    http.setRequestHeader(name,headers[name]);        
                }
            }
        }
        

        static interceptors:IAjaxInterceptors = {
            request:new Interceptor(),
            response:new Interceptor()
        }
    }
    Ajax.interceptors.response.intercept(function(next,resolve:(value:any)=>void,reject:(err:any)=>void){
        let me :Ajax<any> = this;
        if(me.http.status!==200){
            let ex:AjaxException = new AjaxException(me);
            console.error(ex);
            reject(ex);
        }else{
            next.call(this,[resolve,reject]);
        }
    });

    Ajax.interceptors.response.intercept(function(next,resolve:(value:any)=>void,reject:(err:any)=>void){
        let me :Ajax<any> = this;
        let result :string;
        try{
            result= (this.http as XMLHttpRequest).responseText;
        }catch(ex){
            console.error(ex);
            reject(ex);
            return;
        }
        resolve(result);
        return next.call(this,[resolve,reject]);
    });
    Ajax.interceptors.response.intercept(function(next,resolve:(value:any)=>void,reject:(err:any)=>void){
        let me :Ajax<any> = this;
        let opts = me.opts;
        let result :any;
        if(opts.dataType==="json"){
            try{
                result = JSON.parse((this.http as XMLHttpRequest).responseText);
            }catch(ex){
                console.error(ex);
                reject(ex);
                return;
            }
            resolve(result);
            return;
        };
        return next.call(this,[resolve,reject]);
    });
    Ajax.interceptors.response.intercept(function(next,resolve:(value:any)=>void,reject:(err:any)=>void){
        let me :Ajax<any> = this;
        let opts = me.opts;
        let result :any;
        if(opts.dataType==="xml"){
            try{
                result = (this.http as XMLHttpRequest).responseXML;
            }catch(ex){
                console.error(ex);
                reject(ex);
                return;
            }
            resolve(result);
            return;
        };
        return next.call(this,[resolve,reject]);
    });

    export function createElement(tag:string){
        return document.createElement(tag);
    }

    let element_wrapper:HTMLElement = createElement("div");

    export let attach:(elem:HTMLElement,eventId:string,listener:any)=>void;
    export let detech:(elem:HTMLElement,eventId:string,listener:any)=>void;
    if(element_wrapper.addEventListener){
        attach = (elem:HTMLElement,eventId:string,listener:any):void=>elem.addEventListener(eventId,listener,false);
        detech =  (elem:HTMLElement,eventId:string,listener:any):void=>elem.removeEventListener(eventId,listener,false);
    }else if((element_wrapper as any).attachEvent){
        attach = (elem:HTMLElement,eventId:string,listener:any):void=>(elem as any).attachEvent('on'+eventId,listener);
        detech =  (elem:HTMLElement,eventId:string,listener:any):void=>(elem as any).detechEvent('on'+eventId,listener);
    }
    
    let emptyStringRegx = /\s+/g;
    function findClassAt(clsnames:string,cls:string):number{
        let at = clsnames.indexOf(cls);
        let len = cls.length;
        while(at>=0){
            if(at>0){
                let prev = clsnames[at-1];
                if(!emptyStringRegx.test(prev)){at = clsnames.indexOf(cls,at+len);continue;}
            }
            if((at+len)!==clsnames.length){
                let next = clsnames[at+length];
                if(!emptyStringRegx.test(next)){at = clsnames.indexOf(cls,at+len);continue;}
            }
            return at;
        }
        return at;
    }
    export function hasClass(elem:HTMLElement,cls:string):boolean{
        return findClassAt(elem.className,cls)>=0;
    }
    export function addClass(elem:HTMLElement,cls:string):boolean{
        if(findClassAt(elem.className,cls)>=0) return false;
        elem.className+= " " + cls;return true;
    }
    export function removeClass(elem:HTMLElement,cls:string):boolean{
        let clsnames = elem.className;
        let at = findClassAt(clsnames,cls);
        if(at<=0) return false;
        let prev = clsnames.substring(0,at);
        let next =clsnames.substr(at+cls.length);
        elem.className= prev.replace(/(\s+$)/g,"") +" "+ next.replace(/(^\s+)/g,"");
        return true;
    }
    export function replaceClass(elem:HTMLElement,old_cls:string,new_cls:string,alwaysAdd?:boolean):boolean{
        let clsnames = elem.className;
        let at = findClassAt(clsnames,old_cls);
        if(at<=0) {
            if(alwaysAdd) elem.className = clsnames + " " + new_cls;
            return false;
        }
        let prev = clsnames.substring(0,at);
        let next =clsnames.substr(at+old_cls.length);
        elem.className= prev +new_cls+ next;
        return true;
    }
    export let getStyle :(obj:HTMLElement,attr:string)=>string;
    if((element_wrapper as any).currentStyle){
        getStyle = (obj:HTMLElement,attr:string):string=>(obj as any).currentStyle[attr];
    }else {
        getStyle = (obj:HTMLElement,attr:string):string=>{
            let f:any = false;
            return getComputedStyle(obj,f)[attr];
        };
    }
    

    class NullObject{};
    class UndefinedObject{};

    export enum ModelChangeTypes{
        value,
        add,
        remove
    }

    export interface IModelChangeEventArgs{
        value:any;
        index:number;
        changeType:ModelChangeTypes;
        sender:Model
    }
    
    export class Model extends Observable{
        $target:object;
        $name:string|number;
        $superior:Model;
        $members:{[name:string]:Model};
        $item_model:Model;
        constructor(name:string|number,target?:object,superior?:Model){
            super();
            this.$target = target ||{};
            this.$name = name;
            this.$superior = superior;
        }
        get_value(){
            return this.$target[this.$name];
        }

        find_member(name:string,sure?:boolean):Model{
            let member = (this.$members || (this.$members={}))[name];
            if(!member && sure) {
                let target = this.$target[this.$name] ||( this.$target[this.$name] ={});
                member =(this as any)[name]= new Model(name,target,this)
            }
            return member;
        }
        
        
        as_array():Model{
            let value = this.$target[this.$name];
            if(!is_array(value)) value = this.$target[this.$name] = [];
            return this.$item_model = new Model("#index",value,this);
        }
        update_model(value:any):Model{
            if(this.$item_model) return this._update_array(value);
            else if(this.$members) return this._update_object(value);
            else return this._update_value(value);
        }

        clone_self(target?:any):Model{
            if(!target){
                if(this.$item_model) target = [];
                else if(this.$members) target = {};
            }
            let model = new Model(this.$name,target,this);
            let modelValue = model.get_value();
            if(this.$members)for(let n in this.$members){
               (model as any)[n]=model.$members[n] = this.$members[n].clone_self(modelValue);
            }
            if(this.$subscribers){
                let subscribers = model.$subscribers=[];
                for(let i in this.$subscribers) subscribers[i] = this.$subscribers[i];
            }
            return model;
        }

        private _update_value(value:any):Model{
            let modelValue = this.$target[this.$name];
            if(modelValue!==value){
                this.$target[this.$name] = value;
                this.publish({target:this.$target,name:this.$name,value:value,type:ModelChangeTypes.value,sender:this});
            }
            return this;
        }

        private _update_object(value:any):Model{
            let modelValue = this.$target[this.$name];
            if(value===null || value===undefined || typeof value!=="object"){
                modelValue.__YA_IS_NULL__=true;
                for(let n in this.$members) this.$members[n].update_model(undefined);
                return this;
            };
            for(let n in this.$members) this.$members[n].update_model(value[n]);
            return this;
        }
        private _update_array(value:any):Model{
            let modelValue = this.$target[this.$name];
            //如果不是数组或设置为空了，就发送消息
            if(value===null || value===undefined || !is_array(value)){
                modelValue.__YA_IS_NULL__=true;
                this.publish({target:this.$target,name:this.$name,value:value,type:ModelChangeTypes.value});
                return this;
            };
            let removed:Model[]=[];
            for(let i =0,j=value.length;i<j;i++){
                let newValue = value[i];
                let itemModel = this.$members[i];
                if(itemModel)itemModel.update_model(newValue);
                else{
                    itemModel = this.$members[i] = this.$item_model.clone_self(modelValue);
                } 
            }
            
            for(let i =value.length,j=modelValue.length-1;i<=j;j--){
                let itemModel = this.$members[j];
                delete this.$members[j];
                let itemValue = modelValue.pop();
                itemModel.publish({target:this.$target,name:this.$name,value:itemValue,type:ModelChangeTypes.remove,sender:itemModel});
            }

            return this;
        }
    }
    enum MemberAccessorTargetType{
        current,
        root,
        context
    }
    interface IMemberAccessorInfo{
        value_model:Model;
        targetType:MemberAccessorTargetType;
        dpath:DPath;
        get_scope_model:(context:any)=>Model;
    }

    export class VAttribute{
        name:string;
        value:any;
        dep_accessors:IMemberAccessorInfo[];

        /**
         * 双向绑定监听
         * eventId 要监听的事件
         * 如何获取控件值
         * @memberof VAttribute
         */
        bibind_events_handers:{[eventId:string]:(relem:HTMLElement,attr:VAttribute)=>any};
        constructor(name:string,value:any,scope:VScope){
            this.name = name;
            this.value=value;
            
        }
        parseSibind(valueText:string,scope:VScope){
            let accessInfo = this.findMemberAccessor(valueText,scope);
            (this.dep_accessors ||(this.dep_accessors=[])).push(accessInfo);
        }
        parseBibind(valueText:string,scope:VScope){
            let accessInfo = this.findMemberAccessor(valueText,scope);
            (this.dep_accessors ||(this.dep_accessors=[])).push(accessInfo);
        }
        
        protected findMemberAccessor(valueText:string,scope:VScope):IMemberAccessorInfo{
            let dpathtexts = valueText.split(".");
            let first = dpathtexts.shift();
            let targetType = MemberAccessorTargetType.current;
            let get_model:any;
            let model:Model;
            if(first==="$") {
                model = scope.root;
                targetType  = MemberAccessorTargetType.root;
                get_model =(context)=>context.model;
            }else if(first[0]=="$"){
                model = scope.getVariable(first);
                if(!model) throw new Exception(`无法在上下文找到变量:${first}`);
                targetType= MemberAccessorTargetType.context;
                get_model =(context)=>context.variable(first);
            }else{
                model = scope.model;
                get_model=(context)=>context.model;
                dpathtexts.unshift(first);
            } 
            
            for(let i in dpathtexts){
                model =model.find_member(dpathtexts[i],true);
            }
            return {
                get_scope_model:get_model,
                dpath:DPath.fetch(dpathtexts.join(".")),
                targetType:targetType,
                value_model:model
            };
        }
        refreshView(relem:HTMLElement,value:any){
            let tag =relem.tagName;
            if(tag==="INPUT"){
                let type = (relem as HTMLInputElement).type;
                if(type==="radio"){

                }
                (relem as HTMLInputElement).value=value.toString();
            }else if(tag==="TEXTAREA"){
                (relem as HTMLInputElement).value=value.toString();
            }else if(tag==="SELECT"){
                let ops = (relem as HTMLSelectElement).options;
                let noneOp :HTMLOptionElement;
                let noneIndex:number=0;
                let selectedIndex :number=-1;
                for(let i =0,j=ops.length;i<j;i++){
                    let op = ops[i];
                    if(op.value==value){
                        op.selected = true;
                        selectedIndex = i;break;
                    }
                    if(op.value==="") {noneOp=op;noneIndex=i;}
                }
                if(selectedIndex==-1 && noneOp){
                    noneOp.selected = true;
                    selectedIndex = noneIndex;
                }
                (relem as HTMLSelectElement).selectedIndex= selectedIndex;
                (relem as HTMLSelectElement).value = value;
            }
            
        }

        getModelValue:Function;

        /**
         * 单向绑定算法 model->view
         *
         * @param {HTMLElement} relem
         * @param {*} context
         * @returns
         * @memberof VAttribute
         */
        bind(relem:HTMLElement,context:any){
            let valueModel1:Model;
            let valueModels:Model[] = [];
            for(let i in this.dep_accessors){
                let accessorInfo = this.dep_accessors[i];
                let scopeModel = accessorInfo.get_scope_model(context);
                let valueModel:Model = accessorInfo.dpath.getValue(scopeModel);
                if(!valueModel1) valueModel1= valueModel;
                valueModel.subscribe((evt)=>this.refreshView(relem,getModelValue()));
                valueModels.push(valueModel);
            }
            let getModelValue:()=>any;
            if(this.dep_accessors.length==1){
                getModelValue=() =>this.getModelValue(valueModel1.get_value());
            }else{
                getModelValue=()=>{
                    let args = [];
                    for(let i in valueModels){
                        args.push(valueModels[i].get_value());
                    }
                    return this.getModelValue.apply(this,args);
                };
            }

            return this;
        }
    }

    

    
    export class VScope{
        model:Model;
        root:Model;
        controller:any;
        parent:VScope;
        variables:{[name:string]:Model};
        getVariable(name:string):Model{
            let rs :Model;
            if(this.variables){
                if(rs = this.variables[name])return rs;
            }
            if(this.parent) rs = this.parent.find(name,true);
            return rs;
        }
        
    }
    export class VElement{
        tag:string;
        attrs:VAttribute[];
        children:VElement[];
        parent:VElement;
        scope:VScope;
        public constructor(info:ElementInfo){

        }

        render(container:HTMLElement):HTMLElement{
            let relem = document.createElement(this.tag);
            if(container) container.appendChild(relem);
            if(this.attrs){
                for(let i in this.attrs){
                    this.attrs[i].bind(relem,this);
                }
            }
            if(this.children){
                for(let i in this.children){
                    let child = this.children[i];
                    child.render(relem);
                }
            }
            return relem;
        }
    }

    
    interface ElementInfo{
        tag:string;
        attrs:{[name:string]:any};
        children:ElementInfo[];
    }

    function createVElement(tag:string|ElementInfo,attrs?:{[index:string]:any},children?:ElementInfo[]){
        let info:ElementInfo;
        if(typeof tag==="string"){
            info = {
                tag:tag,attrs:attrs,children:children
            };
        }else info = tag as ElementInfo;

    }
    export class View{
        constructor(elem:HTMLElement){

        }
    }
    
}