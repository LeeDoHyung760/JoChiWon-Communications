import { createServer } from 'vite';

const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
try{
  await server.ssrLoadModule('/scripts/testGreenhouse.ts');
}finally{
  await server.close();
}
