// Type definitions for opencv.js

declare module "opencv.js" {
    export class Point {
    }
    export type IPoint = Point | { x: number, y: number }

    export class Scalar {
        constructor()
    }
    export type IScalar = Scalar | [number,number,number,number]

    export class Size {
        readonly width: number
        readonly height: number
    }
    export type ISize = Size | { width: number, height: number }

    export class Mat {
        constructor()
        constructor(size: ISize, tpe: MatType)
        constructor(rows: number, cols: number, tpe: MatType)
        constructor(rows: number, cols: number, tpe: MatType, valToFill)

        readonly rows: number
        readonly cols: number

        data: Uint8Array
        data8S: Uint8Array
        data64F: Float64Array
        data32S: Int32Array
        data32F: Float32Array
        data16U: Uint16Array
        data16S: Int16Array

        size(): Size
        channels(): number
        type(): MatType

        clone(): Mat

        copyTo(dst: Mat, mask: Mat)

        convertTo(dst: Mat, rtype: MatType, alpha?: number, beta?: number)

        // reshape(channels: number, rows?: number): Mat

        isContinuous(): bool

        delete()
    }

    export class MatVector {
        get(i: number): Mat

        push_back(x: Mat): void

        delete()
    }

    export function matFromArray(rows: number, cols: MatType, tpe: MatType,
                                 array: Array<number>)

    export function matFromImageData(imageData: ImageData)

    export function imshow(location: string, mat: Mat)

    export interface MatType {}
    // copied these from Java, hopefully they're the right type
    export const CV_16S: MatType
    export const CV_16SC1: MatType
    export const CV_16SC2: MatType
    export const CV_16SC3: MatType
    export const CV_16SC4: MatType
    export const CV_16U: MatType
    export const CV_16UC1: MatType
    export const CV_16UC2: MatType
    export const CV_16UC3: MatType
    export const CV_16UC4: MatType
    export const CV_32F: MatType
    export const CV_32FC1: MatType
    export const CV_32FC2: MatType
    export const CV_32FC3: MatType
    export const CV_32FC4: MatType
    export const CV_32S: MatType
    export const CV_32SC1: MatType
    export const CV_32SC2: MatType
    export const CV_32SC3: MatType
    export const CV_32SC4: MatType
    export const CV_64F: MatType
    export const CV_64FC1: MatType
    export const CV_64FC2: MatType
    export const CV_64FC3: MatType
    export const CV_64FC4: MatType
    export const CV_8S: MatType
    export const CV_8SC1: MatType
    export const CV_8SC2: MatType
    export const CV_8SC3: MatType
    export const CV_8SC4: MatType
    export const CV_8U: MatType
    export const CV_8UC1: MatType
    export const CV_8UC2: MatType
    export const CV_8UC3: MatType
    export const CV_8UC4: MatType
    export const CV_USRTYPE1: MatType

    export const THRESH_BINARY: number

    export interface ContourMode {}
    export const RETR_EXTERNAL: ContourMode
    export const RETR_LIST: ContourMode
    export const RETR_CCOMP: ContourMode
    export const RETR_TREE: ContourMode

    export interface ContourMethod {}
    export const CHAIN_APPROX_NONE: ContourMethod
    export const CHAIN_APPROX_SIMPLE: ContourMethod
    export const CHAIN_APPROX_TC89_L1: ContourMethod
    export const CHAIN_APPROX_TC89_KCOS: ContourMethod
    export function findContours(image: Mat, outputConturs: MatVector,
                                 outputHierarchy: MatVector,
                                 mode: ContourMode, method: ContourMethod, offset?: Point)
    export function findContours(image: Mat, outputContours: MatVector,
                                 mode: ContourMode, method: ContourMethod, offset?: Point)

    export function drawContours(image: Mat, contours: MatVector, contourIdx: number,
                                 color: IScalar, thickness?: number, lineType?: number,
                                 hierarchy?: Mat, maxLevel?: number, offset?: IPoint)


    export interface CompareOp {}
    export const CMP_EQ: CompareOp
    export const CMP_GT: CompareOp
    export const CMP_GE: CompareOp
    export const CMP_LT: CompareOp
    export const CMP_LE: CompareOp
    export const CMP_NE: CompareOp
    export function compare(src1: Mat, src2: Mat, dst: Mat, cmpop: CompareOp)


    export function cvtColor(src: Mat, dst: Mat, code: ColorConversionCode, dstCn?: number)

    export interface ColorConversionCode {}
    export const COLOR_BGR2BGRA: ColorConversionCode

    // add alpha channel to RGB or BGR image
    export const COLOR_RGB2RGBA: ColorConversionCode
    export const COLOR_BGRA2BGR: ColorConversionCode

    // remove alpha channel from RGB or BGR image
    export const COLOR_RGBA2RGB: ColorConversionCode
    export const COLOR_BGR2RGBA: ColorConversionCode

    // convert between RGB and BGR color spaces (with or without alpha channel)
    export const COLOR_RGB2BGRA: ColorConversionCode
    export const COLOR_RGBA2BGR: ColorConversionCode
    export const COLOR_BGRA2RGB: ColorConversionCode
    export const COLOR_BGR2RGB: ColorConversionCode
    export const COLOR_RGB2BGR: ColorConversionCode
    export const COLOR_BGRA2RGBA: ColorConversionCode
    export const COLOR_RGBA2BGRA: ColorConversionCode
    export const COLOR_BGR2GRAY: ColorConversionCode

    // convert between RGB/BGR and grayscale, color conversions
    export const COLOR_RGB2GRAY: ColorConversionCode
    export const COLOR_GRAY2BGR: ColorConversionCode
    export const COLOR_GRAY2RGB: ColorConversionCode
    export const COLOR_GRAY2BGRA: ColorConversionCode
    export const COLOR_GRAY2RGBA: ColorConversionCode
    export const COLOR_BGRA2GRAY: ColorConversionCode
    export const COLOR_RGBA2GRAY: ColorConversionCode
    export const COLOR_BGR2BGR565: ColorConversionCode

    // convert between RGB/BGR and BGR565 (16-bit images)
    export const COLOR_RGB2BGR565: ColorConversionCode
    export const COLOR_BGR5652BGR: ColorConversionCode
    export const COLOR_BGR5652RGB: ColorConversionCode
    export const COLOR_BGRA2BGR565: ColorConversionCode
    export const COLOR_RGBA2BGR565: ColorConversionCode
    export const COLOR_BGR5652BGRA: ColorConversionCode
    export const COLOR_BGR5652RGBA: ColorConversionCode
    export const COLOR_GRAY2BGR565: ColorConversionCode

    // convert between grayscale to BGR565 (16-bit images)
    export const COLOR_BGR5652GRAY: ColorConversionCode
    export const COLOR_BGR2BGR555: ColorConversionCode

    // convert between RGB/BGR and BGR555 (16-bit images)
    export const COLOR_RGB2BGR555: ColorConversionCode
    export const COLOR_BGR5552BGR: ColorConversionCode
    export const COLOR_BGR5552RGB: ColorConversionCode
    export const COLOR_BGRA2BGR555: ColorConversionCode
    export const COLOR_RGBA2BGR555: ColorConversionCode
    export const COLOR_BGR5552BGRA: ColorConversionCode
    export const COLOR_BGR5552RGBA: ColorConversionCode
    export const COLOR_GRAY2BGR555: ColorConversionCode

    // convert between grayscale and BGR555 (16-bit images)
    export const COLOR_BGR5552GRAY: ColorConversionCode
    export const COLOR_BGR2XYZ: ColorConversionCode

    // convert RGB/BGR to CIE XYZ, color conversions
    export const COLOR_RGB2XYZ: ColorConversionCode
    export const COLOR_XYZ2BGR: ColorConversionCode
    export const COLOR_XYZ2RGB: ColorConversionCode
    export const COLOR_BGR2YCrCb: ColorConversionCode

    // convert RGB/BGR to luma-chroma (aka YCC), color conversions
    export const COLOR_RGB2YCrCb: ColorConversionCode
    export const COLOR_YCrCb2BGR: ColorConversionCode
    export const COLOR_YCrCb2RGB: ColorConversionCode
    export const COLOR_BGR2HSV: ColorConversionCode

    // convert RGB/BGR to HSV (hue saturation value), color conversions
    export const COLOR_RGB2HSV: ColorConversionCode
    export const COLOR_BGR2Lab: ColorConversionCode

    // convert RGB/BGR to CIE Lab, color conversions
    export const COLOR_RGB2Lab: ColorConversionCode
    export const COLOR_BGR2Luv: ColorConversionCode

    // convert RGB/BGR to CIE Luv, color conversions
    export const COLOR_RGB2Luv: ColorConversionCode
    export const COLOR_BGR2HLS: ColorConversionCode

    // convert RGB/BGR to HLS (hue lightness saturation), color conversions
    export const COLOR_RGB2HLS: ColorConversionCode
    export const COLOR_HSV2BGR: ColorConversionCode

    // backward conversions to RGB/BGR
    export const COLOR_HSV2RGB: ColorConversionCode
    export const COLOR_Lab2BGR: ColorConversionCode
    export const COLOR_Lab2RGB: ColorConversionCode
    export const COLOR_Luv2BGR: ColorConversionCode
    export const COLOR_Luv2RGB: ColorConversionCode
    export const COLOR_HLS2BGR: ColorConversionCode
    export const COLOR_HLS2RGB: ColorConversionCode
    export const COLOR_BGR2HSV_FULL: ColorConversionCode
    export const COLOR_RGB2HSV_FULL: ColorConversionCode
    export const COLOR_BGR2HLS_FULL: ColorConversionCode
    export const COLOR_RGB2HLS_FULL: ColorConversionCode
    export const COLOR_HSV2BGR_FULL: ColorConversionCode
    export const COLOR_HSV2RGB_FULL: ColorConversionCode
    export const COLOR_HLS2BGR_FULL: ColorConversionCode
    export const COLOR_HLS2RGB_FULL: ColorConversionCode
    export const COLOR_LBGR2Lab: ColorConversionCode
    export const COLOR_LRGB2Lab: ColorConversionCode
    export const COLOR_LBGR2Luv: ColorConversionCode
    export const COLOR_LRGB2Luv: ColorConversionCode
    export const COLOR_Lab2LBGR: ColorConversionCode
    export const COLOR_Lab2LRGB: ColorConversionCode
    export const COLOR_Luv2LBGR: ColorConversionCode
    export const COLOR_Luv2LRGB: ColorConversionCode
    export const COLOR_BGR2YUV: ColorConversionCode

    // convert between RGB/BGR and YU
    export const COLOR_RGB2YUV: ColorConversionCode
    export const COLOR_YUV2BGR: ColorConversionCode
    export const COLOR_YUV2RGB: ColorConversionCode
    export const COLOR_YUV2RGB_NV12: ColorConversionCode

    // YUV 4:2:0 family to RGB
    export const COLOR_YUV2BGR_NV12: ColorConversionCode
    export const COLOR_YUV2RGB_NV21: ColorConversionCode
    export const COLOR_YUV2BGR_NV21: ColorConversionCode
    export const COLOR_YUV420sp2RGB: ColorConversionCode
    export const COLOR_YUV420sp2BGR: ColorConversionCode
    export const COLOR_YUV2RGBA_NV12: ColorConversionCode
    export const COLOR_YUV2BGRA_NV12: ColorConversionCode
    export const COLOR_YUV2RGBA_NV21: ColorConversionCode
    export const COLOR_YUV2BGRA_NV21: ColorConversionCode
    export const COLOR_YUV420sp2RGBA: ColorConversionCode
    export const COLOR_YUV420sp2BGRA: ColorConversionCode
    export const COLOR_YUV2RGB_YV12: ColorConversionCode
    export const COLOR_YUV2BGR_YV12: ColorConversionCode
    export const COLOR_YUV2RGB_IYUV: ColorConversionCode
    export const COLOR_YUV2BGR_IYUV: ColorConversionCode
    export const COLOR_YUV2RGB_I420: ColorConversionCode
    export const COLOR_YUV2BGR_I420: ColorConversionCode
    export const COLOR_YUV420p2RGB: ColorConversionCode
    export const COLOR_YUV420p2BGR: ColorConversionCode
    export const COLOR_YUV2RGBA_YV12: ColorConversionCode
    export const COLOR_YUV2BGRA_YV12: ColorConversionCode
    export const COLOR_YUV2RGBA_IYUV: ColorConversionCode
    export const COLOR_YUV2BGRA_IYUV: ColorConversionCode
    export const COLOR_YUV2RGBA_I420: ColorConversionCode
    export const COLOR_YUV2BGRA_I420: ColorConversionCode
    export const COLOR_YUV420p2RGBA: ColorConversionCode
    export const COLOR_YUV420p2BGRA: ColorConversionCode
    export const COLOR_YUV2GRAY_420: ColorConversionCode
    export const COLOR_YUV2GRAY_NV21: ColorConversionCode
    export const COLOR_YUV2GRAY_NV12: ColorConversionCode
    export const COLOR_YUV2GRAY_YV12: ColorConversionCode
    export const COLOR_YUV2GRAY_IYUV: ColorConversionCode
    export const COLOR_YUV2GRAY_I420: ColorConversionCode
    export const COLOR_YUV420sp2GRAY: ColorConversionCode
    export const COLOR_YUV420p2GRAY: ColorConversionCode
    export const COLOR_YUV2RGB_UYVY: ColorConversionCode

    // YUV 4:2:2 family to RGB.
    export const COLOR_YUV2BGR_UYVY: ColorConversionCode
    export const COLOR_YUV2RGB_Y422: ColorConversionCode
    export const COLOR_YUV2BGR_Y422: ColorConversionCode
    export const COLOR_YUV2RGB_UYNV: ColorConversionCode
    export const COLOR_YUV2BGR_UYNV: ColorConversionCode
    export const COLOR_YUV2RGBA_UYVY: ColorConversionCode
    export const COLOR_YUV2BGRA_UYVY: ColorConversionCode
    export const COLOR_YUV2RGBA_Y422: ColorConversionCode
    export const COLOR_YUV2BGRA_Y422: ColorConversionCode
    export const COLOR_YUV2RGBA_UYNV: ColorConversionCode
    export const COLOR_YUV2BGRA_UYNV: ColorConversionCode
    export const COLOR_YUV2RGB_YUY2: ColorConversionCode
    export const COLOR_YUV2BGR_YUY2: ColorConversionCode
    export const COLOR_YUV2RGB_YVYU: ColorConversionCode
    export const COLOR_YUV2BGR_YVYU: ColorConversionCode
    export const COLOR_YUV2RGB_YUYV: ColorConversionCode
    export const COLOR_YUV2BGR_YUYV: ColorConversionCode
    export const COLOR_YUV2RGB_YUNV: ColorConversionCode
    export const COLOR_YUV2BGR_YUNV: ColorConversionCode
    export const COLOR_YUV2RGBA_YUY2: ColorConversionCode
    export const COLOR_YUV2BGRA_YUY2: ColorConversionCode
    export const COLOR_YUV2RGBA_YVYU: ColorConversionCode
    export const COLOR_YUV2BGRA_YVYU: ColorConversionCode
    export const COLOR_YUV2RGBA_YUYV: ColorConversionCode
    export const COLOR_YUV2BGRA_YUYV: ColorConversionCode
    export const COLOR_YUV2RGBA_YUNV: ColorConversionCode
    export const COLOR_YUV2BGRA_YUNV: ColorConversionCode
    export const COLOR_YUV2GRAY_UYVY: ColorConversionCode
    export const COLOR_YUV2GRAY_YUY2: ColorConversionCode
    export const COLOR_YUV2GRAY_Y422: ColorConversionCode
    export const COLOR_YUV2GRAY_UYNV: ColorConversionCode
    export const COLOR_YUV2GRAY_YVYU: ColorConversionCode
    export const COLOR_YUV2GRAY_YUYV: ColorConversionCode
    export const COLOR_YUV2GRAY_YUNV: ColorConversionCode
    export const COLOR_RGBA2mRGBA: ColorConversionCode

    // alpha premultiplication
    export const COLOR_mRGBA2RGBA: ColorConversionCode
    export const COLOR_RGB2YUV_I420: ColorConversionCode

    // RGB to YUV 4:2:0 family.
    export const COLOR_BGR2YUV_I420: ColorConversionCode
    export const COLOR_RGB2YUV_IYUV: ColorConversionCode
    export const COLOR_BGR2YUV_IYUV: ColorConversionCode
    export const COLOR_RGBA2YUV_I420: ColorConversionCode
    export const COLOR_BGRA2YUV_I420: ColorConversionCode
    export const COLOR_RGBA2YUV_IYUV: ColorConversionCode
    export const COLOR_BGRA2YUV_IYUV: ColorConversionCode
    export const COLOR_RGB2YUV_YV12: ColorConversionCode
    export const COLOR_BGR2YUV_YV12: ColorConversionCode
    export const COLOR_RGBA2YUV_YV12: ColorConversionCode
    export const COLOR_BGRA2YUV_YV12: ColorConversionCode
    export const COLOR_BayerBG2BGR: ColorConversionCode

    // Demosaicing.
    export const COLOR_BayerGB2BGR: ColorConversionCode
    export const COLOR_BayerRG2BGR: ColorConversionCode
    export const COLOR_BayerGR2BGR: ColorConversionCode
    export const COLOR_BayerBG2RGB: ColorConversionCode
    export const COLOR_BayerGB2RGB: ColorConversionCode
    export const COLOR_BayerRG2RGB: ColorConversionCode
    export const COLOR_BayerGR2RGB: ColorConversionCode
    export const COLOR_BayerBG2GRAY: ColorConversionCode
    export const COLOR_BayerGB2GRAY: ColorConversionCode
    export const COLOR_BayerRG2GRAY: ColorConversionCode
    export const COLOR_BayerGR2GRAY: ColorConversionCode
    export const COLOR_BayerBG2BGR_VNG: ColorConversionCode

    // Demosaicing using Variable Number of Gradients.
    export const COLOR_BayerGB2BGR_VNG: ColorConversionCode
    export const COLOR_BayerRG2BGR_VNG: ColorConversionCode
    export const COLOR_BayerGR2BGR_VNG: ColorConversionCode
    export const COLOR_BayerBG2RGB_VNG: ColorConversionCode
    export const COLOR_BayerGB2RGB_VNG: ColorConversionCode
    export const COLOR_BayerRG2RGB_VNG: ColorConversionCode
    export const COLOR_BayerGR2RGB_VNG: ColorConversionCode
    export const COLOR_BayerBG2BGR_EA: ColorConversionCode

    // Edge-Aware Demosaicing.
    export const COLOR_BayerGB2BGR_EA: ColorConversionCode
    export const COLOR_BayerRG2BGR_EA: ColorConversionCode
    export const COLOR_BayerGR2BGR_EA: ColorConversionCode
    export const COLOR_BayerBG2RGB_EA: ColorConversionCode
    export const COLOR_BayerGB2RGB_EA: ColorConversionCode
    export const COLOR_BayerRG2RGB_EA: ColorConversionCode
    export const COLOR_BayerGR2RGB_EA: ColorConversionCode
    export const COLOR_COLORCVT_MAX: ColorConversionCode

    export function threshold(src: Mat, dst: Mat, thresh: number, maxval: number,
                              tpe: ThresholdType): number

    export interface ThresholdType {}
    export const THRESH_BINARY: ThresholdType
    export const THRESH_BINARY_INV: ThresholdType
    export const THRESH_TRUNC: ThresholdType
    export const THRESH_TOZERO: ThresholdType
    export const THRESH_TOZERO_INV: ThresholdType
    export const THRESH_MASK: ThresholdType
    export const THRESH_OTSU: ThresholdType
    export const THRESH_TRIANGLE: ThresholdType

    export function split(mat: Mat, output: MatVector)

    export function resize(src: Mat, output: Mat, dsize: ISize, fx?: number, fy?: number,
                           interpolation?: InterpolationMethod)

    export interface InterpolationMethod {}
    export const INTER_NEAREST: InterpolationMethod
    export const INTER_LINEAR: InterpolationMethod
    export const INTER_AREA: InterpolationMethod
    export const INTER_CUBIC: InterpolationMethod
    export const INTER_LANCZOS4: InterpolationMethod

    export function blur(src: Mat, dst: Mat, ksize: ISize, anchor?: IPoint,
                         borderType?: BorderType)
    export interface BorderType {}
    export const BORDER_REPLICATE: BorderType
    export const BORDER_REFLECT: BorderType
    export const BORDER_REFLECT_101: BorderType
    export const BORDER_WRAP: BorderType
    export const BORDER_CONSTANT: BorderType

    export function approxPolyDP(curve: Mat, approxCurve: Mat, epsilon: number, closed: bool)

    export function connectedComponentsWithStats(image: Mat, labels:Mat,
                                                 stats: Mat, centroids: Mat,
                                                 connectivity?: number,
                                                 ltype?: CV_32S | CV_16U)
    export function connectedComponents(image: Mat, labels:Mat,
                                        connectivity?: number, ltype?: CV_32S | CV_16U)

    // type of data must be CV_32F, CV_32FC2, or CV_32FC2
    export function kmeans(data: Mat, K: number, bestLabels: Mat,
                           criteria: TermCriteria, attempts: number,
                           flags: KMeansFlags, centers?: Mat)

    export class TermCriteria {
        constructor()
        constructor(tpe: TermCriteriaType, maxCount: number, epsilon: number)
    }
    type TermCriteriaType = TermCriteria_COUNT | TermCriteria_MAX_ITER | TermCriteria_EPS
    export const TermCriteria_COUNT: number
    export const TermCriteria_MAX_ITER: number
    export const TermCriteria_EPS: number

    export interface KMeansFlags {}
    export const KMEANS_RANDOM_CENTERS: KMeansFlags
    export const KMEANS_PP_CENTERS: KMeansFlags
    export const KMEANS_USE_INITIAL_LABELS: KMeansFlags

    // export class CVKNearest {
    //     constructor()
    //     constructor(trainData: Mat, responses: Mat, sampleIdx?: Mat, isRegression?: bool,
    //                 max_k?: number)

    //     train(trainData: Mat, responses: Mat, sampleIdx?: Mat, isRegression?: bool,
    //           maxK?: number, updateBase?: bool): bool

    //     findNearest(samples: Mat, k: number, results: Mat, neighborResponses: Mat, dists: Mat): number

    //     get_max_k(): number

    //     get_var_count(): number

    //     get_sample_count(): number

    //     is_regression(): bool
    // }
}
