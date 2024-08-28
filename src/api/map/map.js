import request from '@/utils/request'

//获取全景图片坐标地址等信息
export function getPhotoDataList() {
    return request({
        url: '/panorama/pano/getLocation',
        method: 'get'
    })
}

//获取全景图片信息
export function getPano(id) {
    return request({
        url: '/panorama/pano/getPano?id=' + id,
        method: 'get',
        responseType: 'blob',
    })
}