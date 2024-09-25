<template>
    <div class="box" v-click-outside="hide" ref="box">
        <input type="text" @focus="show"> 
        <div v-show="isShow">
            面板
        </div>

    </div>
</template>

<script>
export default {

    directives:{
        clickOutside:{
            bind(el,bindings,vnode){

                console.log(bindings);

                const handler = (e)=>{
                    if(!el.contains(e.target)){
                        // 点击的是外边
                        let fn = vnode.context[bindings.expression];
                        fn();
                    }
                }

                el.handler = handler;
                document.addEventListener('click',handler)
            },

            unbind(el){
                console.log(111);
                document.removeEventListener('click',el.handler)
            }
        }
    },

    data() {
        return {
            isShow: false
        }
    },

    methods: {
        show() {
            this.isShow = true;
        },

        hide() {
            this.isShow = false;
        }
    },

    mounted(){
        
    }
}


</script>

<style>
.box {
    display: inline-flex;
    flex-direction: column;
    border: 1px solid red;
}
</style>