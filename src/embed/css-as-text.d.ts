/** esbuild loads CSS as a text string for inlining into widget.js */
declare module "*.css" {
  const cssText: string;
  export default cssText;
}
