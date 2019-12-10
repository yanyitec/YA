declare function define(depts,definer?):void;
define(function(b,c){
    console.trace(`defining [${this.id}]`);
    return {
        filename:"req-b.ts",
        method:(txt)=>{
            console.log("Invoke b.method in ["+txt+"]");
        }
    }; 
});
console.trace(`[req-b] is loaded`);