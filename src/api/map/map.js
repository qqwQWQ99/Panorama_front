import request from '@/utils/request'

//获取全景图片坐标地址等信息
export function getPhotoDataList() {
    return request({
        url: '/panorama/pano/getLocation',
        method: 'get'
    })
}