import { exec } from 'child_process';
import { src, dest, watch, series } from 'gulp';
import ts from 'gulp-typescript';

const tsProject = ts.createProject('tsconfig.json');

//编译任务
function compile() {
  //设置文件输出的路径，将src文件下的ts 源代码文件编译成JS文件输出到dist目录下。
  const tsResult = src('src/**/*.ts').pipe(tsProject());
  return tsResult.js.pipe(dest('./dist'));
}

async function run(): Promise<any> {
  return new Promise((resolve) => {
    //运行命令 node 的运行命令 【node 文件名 】  能够运行js
    exec('node ./dist', (err: any, stdout: any, stderr: any) => {
      //这里是运行结束后的 回调方法  分别有三个返回值 err是错误信息， stdout 是标准运行，stderr 是标准错误
      JSON.stringify(stdout);
      if (stderr) {
        console.log(stderr);
      }
      resolve(err);
    });
  });
}

//监听 任务
function watchTs() {
  //series 用于连接两个方法 ，watch监听， 监听src 下的文件变动后 先执行compile 方法 然后再执行 run 方法。
  watch('src/**/*.ts', series(compile, run));
}

export { compile, watchTs as watch };

export default series(compile, run);
