// import {interceptable} from "../YA.require";
// export class TestInterceptor{
//     constructor(){}
//     i=5;
//     @interceptable()
//     func1(a){
//         console.log("func1 entered.");
//         debugger;
//         (this as any).i++;
//         console.log(`TestInterceptor.func1 is invoked[a=${a+this.i},i=${(this as any).i},return 4],${typeof Reflect}`);
//         return 4;
//     }
// }

// let testInterceptor=new TestInterceptor();
// (testInterceptor.func1 as any).intercept(function(next,a){
//     console.log("interceptor 1 entered.");
//     debugger;
//     (this as any).i++;
//     let ret = next.call(this as any,a);
//     console.log(`interceptor 1 is invokeded[a=${a},i=${(this as any).i},return=${++ret}],${this instanceof TestInterceptor}`);
//     return ret;
// }).intercept(function(next,a){
//     console.log("interceptor 2 entered.");
//     debugger;
//     (this as any).i++;
//     let ret = next.call(this as any,a);
//     console.log(`intercept 2 is invokeded[a=${a},i=${(this as any).i},return=${++ret}]`);
//     return ret;
// });

// let rs = testInterceptor.func1("arg-A");
// console.log(`finally rs=${rs},i=${testInterceptor.i}`);