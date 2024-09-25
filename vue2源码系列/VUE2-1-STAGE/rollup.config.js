import babel from 'rollup-plugin-babel'

export default {
    input:'./src/index.js',
    output:{
        format:'umd', //window.Vue
        name:'Vue',
        file:'dist/vue.js',
        sourcemap:true //es5 -> es6
    },
    plugin:[
        babel({ //使用babel进行转换,排除node_modules
            exclude:'node_modules/**'
        })
    ]
}