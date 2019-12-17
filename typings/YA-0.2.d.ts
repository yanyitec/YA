declare let Reflect: any;
declare namespace YA {
    let trimRegx: RegExp;
    class Exception extends Error {
        internal_error: Error;
        extra: any;
        constructor(message: string, internalError?: any, extra?: any);
    }
    function is_array(obj: any): boolean;
    /**
     * 管道
     *
     * @export
     * @class Pipe
     */
    class Pipe {
        private _pipes;
        constructor();
        pipe(args: any[] | Function, command?: Function): Pipe;
        removePipe(args: any[] | Function, command?: Function): this;
        execute(input: any, self?: any): any;
        bind(first: Function): Function;
    }
    /**
     * 拦截器/装饰器
     *
     * @export
     * @class Interceptor
     */
    class Interceptor {
        raw: Function;
        func: Function;
        private _next;
        constructor(method?: Function);
        intercept(interceptor: Function): Interceptor;
        execute(me: any, args: any[]): any;
    }
    function interceptable(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
    interface IObservable {
        subscribe(listener: Function): IObservable;
        unsubscribe(listener?: Function): IObservable;
        publish(...args: any[]): IObservable;
    }
    /**
     * 发布/订阅
     *
     * @export
     * @class Observable
     * @implements {IObservable}
     */
    class Observable implements IObservable {
        $subscribers: Function[];
        subscribe(observer: Function): IObservable;
        unsubscribe(observer?: Function): IObservable;
        publish(...args: any[]): IObservable;
        constructor(target?: any);
    }
    interface IEventable {
        attachEvent(eventId: string, listener: Function, extras?: any): IEventable;
        detechEvent(eventId: string, listener: any, Function: any, extras?: any): any;
        dispachEvent(eventId: string, evtArg: any, extras?: any): any;
    }
    interface IEventArgs {
        eventId?: string;
        extras?: any;
        sender?: IEventable;
    }
    interface IEventListener {
        listener: (evtArgs: IEventArgs) => any;
        extras?: any;
    }
    /**
     * 事件
     *
     * @export
     * @class Eventable
     * @implements {IEventable}
     */
    class Eventable implements IEventable {
        protected _events: {
            [eventId: string]: IEventListener[];
        };
        attachEvent(eventId: string, listener: (evtArgs: IEventArgs) => any, extras?: any): IEventable;
        detechEvent(eventId: string, listener: (evtArgs: IEventArgs) => any, extras?: any): IEventable;
        dispachEvent(eventId: string, evtArgs: IEventArgs, extras?: any): IEventable;
        constructor(target?: any);
    }
    class Proxy {
        constructor(target: object, methods?: string[], proxy?: any);
    }
    interface IThenable<T> {
        then(onfullfilled?: (value: T) => void, onReject?: (value: any) => void): IThenable<T>;
    }
    interface ICompletable {
        complete(onComplete: Function): ICompletable;
    }
    enum AwaitorStates {
        padding = 0,
        fulfilled = 1,
        rejected = -1,
    }
    enum AwaitorTypes {
        awaitor = 0,
        deferrer = 1,
    }
    /**
     * 简单的异步对象
     *
     * @export
     * @class Awaitor<T>
     */
    class Awaitor<T> {
        awaitor_status: AwaitorStates;
        awaitor_value: any;
        awaitor_type: AwaitorTypes;
        success: (onfulfilled: (value: any) => void) => Awaitor<T>;
        ok: (onfulfilled: (value: any) => void) => Awaitor<T>;
        error: (onrejected: (value: any) => void) => Awaitor<T>;
        catch: (onrejected: (value: any) => void) => Awaitor<T>;
        resolve: (value: any) => void;
        reject: (err: any) => void;
        private _fulfillCallbacks;
        private _rejectCallbacks;
        constructor(asyncProcess?: {
            (fulfill: (value: any) => void, reject: (err: any) => void): void;
        }, resolveByApply?: boolean);
        then(onfulfilled: (value: any) => void, onrejected: (err: any) => void): Awaitor<T>;
        done(onfulfilled: (value: any) => void): Awaitor<T>;
        fail(onrejected: (value: any) => void): Awaitor<T>;
        complete(oncomplete: Function): Awaitor<T>;
        static all(_awators: IThenable<any>[]): Awaitor<any>;
        static race(_awators: IThenable<any>[]): Awaitor<any>;
        static resolve(value?: any): Awaitor<any>;
        static reject(err?: any): Awaitor<any>;
    }
    class DPath {
        constructor(pathOrValue: any, type?: string);
        getValue(data: any): any;
        setValue(data: any, value: any): DPath;
        static fetch(pathtext: string): DPath;
        static const(value: any): DPath;
        static dymanic(value: Function): DPath;
        static paths: {
            [name: string]: DPath;
        };
    }
    /**
     * a={dd}&b={d.s({a,b})}
     *
     * @export
     * @class StringTemplate
     */
    class StringTemplate {
        dpaths: any[];
        text: string;
        constructor(template: string);
        replace(data: any, convertor?: (input: string) => string): string;
        static replace(template: string, data?: any, convertor?: (t: string) => string): string;
        static caches: {
            [key: string]: StringTemplate;
        };
    }
    /**
     * 资源/模块状态
     *
     * @export
     * @enum {number}
     */
    enum ResourceStates {
        /**
         * 被请求
         */
        required = 0,
        /**
         * 正在从 网站/本地或其他资源地址加载，但尚未完全返回。
         */
        loading = 1,
        /**
         * 已经从资源地址中载入，还在处理依赖关系
         */
        waiting = 2,
        /**
         * 所有依赖项已加载完成，但模块还在初始化中
         */
        initializing = 3,
        /**
         * 模块已经完全载入，包括依赖项与内置资源
         */
        completed = 4,
        error = -1,
    }
    interface IResourceOpts {
        url: string;
        type?: string;
    }
    /**
     * 可单独载入的js/css等资源
     *
     * @export
     * @interface IResource
     */
    interface IResource extends IThenable<any>, ICompletable {
        /**
         * 资源的唯一编号
         *
         * @type {string}
         * @memberof IResource
         */
        id: string;
        /**
         * 资源的Url
         *
         * @type {string}
         * @memberof IResource
         */
        url: string;
        /**
         * 资源类型
         *
         * @type {string}
         * @memberof IResource
         */
        type: string;
        /**
         * 资源在网页中占据的元素
         *
         * @type {*}
         * @memberof IResource
         */
        element: any;
        /**
         * 资源状态
         *
         * @type {ResourceStates}
         * @memberof IResource
         */
        status: ResourceStates;
        /**
         * state变化的原因
         *
         * @type {*}
         * @memberof IResource
         */
        reason: any;
        /**
         * 添加或删除模块状态监听函数
         * 如果返回false，则会从监听中把自己去掉。
         *
         * @param {(boolean|{(res:IResource):void})} addOrRemove
         * @param {(res:IResource)=>void} [callback]
         * @returns {IResource}
         * @memberof IResource
         */
        statechange(addOrRemove: boolean | {
            (res: IResource): void;
        }, callback?: (res: IResource) => void): IResource;
    }
    class Resource extends Awaitor<any> implements IResource {
        /**
         * 资源的唯一编号
         *
         * @type {string}
         * @memberof IResource
         */
        id: string;
        /**
         * 资源的Url
         *
         * @type {string}
         * @memberof IResource
         */
        url: string;
        /**
         * 资源类型
         *
         * @type {string}
         * @memberof IResource
         */
        type: string;
        /**
         * 资源在网页中占据的元素
         *
         * @type {*}
         * @memberof IResource
         */
        element: any;
        /**
         * state变化的原因
         *
         * @type {*}
         * @memberof IResource
         */
        reason: any;
        /**
         * 资源状态
         *
         * @type {ResourceStates}
         * @memberof IResource
         */
        status: ResourceStates;
        request_id: string;
        private _resolve;
        private _reject;
        protected _statechangeCallbacks: {
            (res: IResource): void;
        }[];
        constructor(opts: IResourceOpts);
        /**
         * 添加或删除模块状态监听函数
         * 如果返回false，则会从监听中把自己去掉。
         *
         * @param {(boolean|{(res:IResource):void})} addOrRemove
         * @param {(res:IResource)=>void} [callback]
         * @memberof IResource
         */
        statechange(addOrRemove: boolean | {
            (res: IResource): void;
        }, callback?: (res: IResource) => void): IResource;
        protected _makeUrl(url: string): string;
        _changeState(status: ResourceStates, reason?: any): IResource;
        protected _load(): void;
        protected _doLoad(okCallback: (value: any) => void, errCallback: (err: any) => void): any;
        protected _attatchEvents(elem: any, okCallback: any, errCallback: any): void;
        protected _getResourceElementContainer(): any;
    }
    class StylesheetResource extends Resource {
        constructor(opts: IResourceOpts);
        protected _doLoad(okCallback: any, errCallback: any): HTMLLinkElement;
    }
    interface IDefineParams {
        dependences?: string[];
        defination?: Function;
        content?: any;
    }
    /**
     * 带着依赖项的资源
     *
     * @export
     * @interface IModule
     */
    interface IModule extends IResource {
        /**
         * 模块内容，模块加载产生内容。
         *
         * @type {*}
         * @memberof IModule
         */
        content: any;
        /**
         * 该模块的依赖项
         *
         * @type {IModule[]}
         * @memberof IModule
         */
        dependences: IResource[];
    }
    class Module extends Resource implements IModule {
        /**
         * 模块内容，模块加载产生内容。
         *
         * @type {*}
         * @memberof IModule
         */
        content: any;
        /**
         * 该模块的依赖项
         *
         * @type {IModule[]}
         * @memberof IModule
         */
        dependences: IResource[];
        _waitingDepsModuleList?: IModule[];
        constructor(opts: IResourceOpts, waitingDepsModuleList?: IModule[]);
        _load(): void;
        protected _tryChangeState(status: ResourceStates, reason?: any): IModule;
        _srcLoaded(): this;
        private _depsReady(definer, depValues);
        /**
         * 把自己从“等待依赖项的模块列表”中移除
         *
         * @private
         * @memberof Module
         */
        private _removeMeFroWaitingDepModuleList();
    }
    let cachedModules: {
        [id: string]: Module;
    };
    function define(depNames: string | string[] | Function, definer: Function | any): void;
    function require(depNames: string[] | string): ICompletable;
    function resolveUrl(url: string, data?: any): any;
    interface IAjaxOpts {
        method?: string;
        url: string;
        data?: any;
        type?: string;
        dataType?: string;
        cache?: boolean;
        sync?: boolean;
        headers?: {
            [name: string]: string;
        };
    }
    interface IAjaxInterceptors {
        request: Interceptor;
        response: Interceptor;
    }
    class AjaxException extends Exception {
        status: number;
        statusText: string;
        instance: Ajax<any>;
        constructor(instance: Ajax<any>);
    }
    class Ajax<T> extends Awaitor<T> {
        opts: IAjaxOpts;
        url: string;
        method: string;
        data: any;
        http: XMLHttpRequest;
        requestHeaders: {
            [name: string]: string;
        };
        constructor(opts: IAjaxOpts);
        private _init_http(opts, resolve, reject);
        private _init_http_event(http, opts, resolve, reject);
        private _init_sendData(opts, sendDataType, method);
        private _init_headers(headers, http, type, method);
        static interceptors: IAjaxInterceptors;
    }
    function createElement(tag: string): HTMLElement;
    let attach: (elem: HTMLElement, eventId: string, listener: any) => void;
    let detech: (elem: HTMLElement, eventId: string, listener: any) => void;
    function hasClass(elem: HTMLElement, cls: string): boolean;
    function addClass(elem: HTMLElement, cls: string): boolean;
    function removeClass(elem: HTMLElement, cls: string): boolean;
    function replaceClass(elem: HTMLElement, old_cls: string, new_cls: string, alwaysAdd?: boolean): boolean;
    let getStyle: (obj: HTMLElement, attr: string) => string;
    enum ModelChangeTypes {
        value = 0,
        add = 1,
        remove = 2,
    }
    interface IModelChangeEventArgs {
        value: any;
        index: number;
        changeType: ModelChangeTypes;
        sender: Model;
    }
    class Model extends Observable {
        $target: object;
        $name: string | number;
        $superior: Model;
        $members: {
            [name: string]: Model;
        };
        $item_model: Model;
        constructor(name: string | number, target?: object, superior?: Model);
        get_value(): any;
        find_member(name: string, sure?: boolean): Model;
        as_array(): Model;
        update_model(value: any): Model;
        clone_self(target?: any): Model;
        private _update_value(value);
        private _update_object(value);
        private _update_array(value);
    }
    enum MemberAccessorTargetType {
        current = 0,
        root = 1,
        context = 2,
    }
    interface IMemberAccessorInfo {
        value_model: Model;
        targetType: MemberAccessorTargetType;
        dpath: DPath;
        get_scope_model: (context: any) => Model;
    }
    class VAttribute {
        name: string;
        value: any;
        dep_accessors: IMemberAccessorInfo[];
        /**
         * 双向绑定监听
         * eventId 要监听的事件
         * 如何获取控件值
         * @memberof VAttribute
         */
        bibind_events_handers: {
            [eventId: string]: (relem: HTMLElement, attr: VAttribute) => any;
        };
        constructor(name: string, value: any, scope: VScope);
        parseSibind(valueText: string, scope: VScope): void;
        parseBibind(valueText: string, scope: VScope): void;
        protected findMemberAccessor(valueText: string, scope: VScope): IMemberAccessorInfo;
        refreshView(relem: HTMLElement, value: any): void;
        getModelValue: Function;
        /**
         * 单向绑定算法 model->view
         *
         * @param {HTMLElement} relem
         * @param {*} context
         * @returns
         * @memberof VAttribute
         */
        bind(relem: HTMLElement, context: any): this;
    }
    class VScope {
        model: Model;
        root: Model;
        controller: any;
        parent: VScope;
        variables: {
            [name: string]: Model;
        };
        getVariable(name: string): Model;
    }
    class VElement {
        tag: string;
        attrs: VAttribute[];
        children: VElement[];
        parent: VElement;
        scope: VScope;
        constructor(info: IElementInfo);
        render(container: HTMLElement): HTMLElement;
    }
    interface IElementInfo {
        tag: string;
        attrs: {
            [name: string]: any;
        };
        children: IElementInfo[];
    }
    class View {
        constructor(elem: HTMLElement);
    }
}
