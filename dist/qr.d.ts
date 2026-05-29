export default QRCode;
export type InputData = string | ArrayLike<number>;
declare namespace QRCode {
    /** @typedef {'numeric'|'alphanumeric'|'octet'} ModeParam */
    /** @typedef {'L'|'M'|'Q'|'H'} EccLevelParam */
    /**
     * @typedef {Object} QRCodeOptions
     * @property {number} [version] - Version in [1,40]; defaults to auto-select.
     * @property {ModeParam} [mode] - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
     * @property {EccLevelParam} [ecclevel] - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
     * @property {number} [mask] - Mask in [0,7]; defaults to auto-select.
     * @property {number} [modulesize] - Size of each module in pixels; defaults to 5px.
     * @property {number} [margin] - Margin in modules; defaults to 4.
     * @property {string} [unit] - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
     * @property {number} [ratio] - Ratio for non-px sizes; defaults to 1.
     */
    /**
     * @typedef {Object} RenderOptions
     * @property {number} moduleSize - Size of each module, in pixels.
     * @property {number} margin - Margin around the code, in modules.
     * @property {string} unit - Unit for non-px sizes (e.g., 'mm', 'cm').
     * @property {number} ratio - Ratio for non-px sizes.
     */
    /**
     * resolves the drawing-related options to concrete values, filling in the
     * library defaults for anything the caller omitted. shared by every
     * rendering method so the defaults stay in one place.
     * @returns {RenderOptions}
     * @private
     */
    function _getRenderOptions(options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): {
        /**
         * - Size of each module, in pixels.
         */
        moduleSize: number;
        /**
         * - Margin around the code, in modules.
         */
        margin: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm').
         */
        unit: string;
        /**
         * - Ratio for non-px sizes.
         */
        ratio: number;
    };
    function generate(data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): number[][];
    function generateHTML(data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): HTMLDivElement;
    function generateSVG(data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): SVGSVGElement;
    /**
     * draws the QR code for given data into a caller-provided canvas. the
     * canvas is resized to fit the code (including its margin) and painted in
     * place; nothing else on the canvas is preserved.
     * @returns {HTMLCanvasElement} the same canvas, for convenience.
     */
    function drawIntoCanvas(canvas: HTMLCanvasElement, data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): HTMLCanvasElement;
    function generateCanvas(data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): HTMLCanvasElement;
    function generateDataURL(data: InputData, options: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    } | undefined, type: Parameters<typeof HTMLCanvasElement.prototype.toDataURL>[0]): string;
    function generatePNG(data: InputData, options?: {
        /**
         * - Version in [1,40]; defaults to auto-select.
         */
        version?: number;
        /**
         * - One of 'numeric', 'alphanumeric', 'octet'; defaults to auto-select.
         */
        mode?: "numeric" | "alphanumeric" | "octet";
        /**
         * - One of 'L', 'M', 'Q', 'H'; defaults to 'L'.
         */
        ecclevel?: "L" | "M" | "Q" | "H";
        /**
         * - Mask in [0,7]; defaults to auto-select.
         */
        mask?: number;
        /**
         * - Size of each module in pixels; defaults to 5px.
         */
        modulesize?: number;
        /**
         * - Margin in modules; defaults to 4.
         */
        margin?: number;
        /**
         * - Unit for non-px sizes (e.g., 'mm', 'cm'); defaults to 'px'.
         */
        unit?: string;
        /**
         * - Ratio for non-px sizes; defaults to 1.
         */
        ratio?: number;
    }): string;
}
