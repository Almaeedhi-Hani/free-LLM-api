/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  async rewrites(){
    return {beforeFiles:[{source:'/llms.txt',destination:'/api/llm-index'}],afterFiles:[],fallback:[]};
  },
  async headers(){
    const value='< /llms.txt >; rel="describedby"; type="text/plain", </llms-full.txt>; rel="alternate"; type="text/plain"'.replace('< /llms.txt >','</llms.txt>');
    return ['/', '/packages','/services/:path*','/insights/:path*','/:locale(en|zh)','/:locale(en|zh)/packages','/:locale(en|zh)/services/:path*','/:locale(en|zh)/insights/:path*'].map(source=>({source,headers:[{key:'Link',value}]}));
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;
