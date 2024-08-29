<template>
  <div style="height: 90vh; width: 100%;">
    <div id="mapContainer" ref="mapContainer"></div>
    <div v-show="showImage" id="imageViewer" class="image-viewer">
      <div class="full-image" id="viewer" ref="viewerContainer"></div>
      <button class="return-button" @click="returnToMap">返回</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { Viewer } from "photo-sphere-viewer";
import "photo-sphere-viewer/dist/photo-sphere-viewer.css";
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import Tile from 'ol/layer/Tile'    // 瓦片渲染方法
import { XYZ } from "ol/source";
import { transform } from "ol/proj";                 // 地图样式
import { defaults } from "ol/control";
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import {Style, Fill, Stroke, Icon, Circle as CircleStyle, Text} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { singleClick } from 'ol/events/condition';
import { Point } from "ol/geom";
import Cluster from 'ol/source/Cluster';
import { getPhotoDataList, getPano } from '@/api/map/map.js'
import mapPng from '@/assets/icons/map.png'
import map1Png from '@/assets/icons/map1.png'

const viewerContainer = ref<HTMLDivElement | null>(null);
const mapContainer = ref<HTMLDivElement | null>(null);
const showImage = ref(false);
let map: Map;
// 全景视图
let panoramaViewer = null;

async function getPhotoData() {
  const photoData = await getPhotoDataList()
  return photoData
}

async function getPanoData(id) {
  const panoData = await getPano(id)
  return panoData
}

const tks = ['2b3024a8d9d2ad627fb1cdf6c9848e4b', '99deae501a50e17131f690f0f5b325eb', '394f33decf86eb6e084d5f4f85fe7d6c', 'f3aee4e9368106d2486b33b6cdf07822']
const randomNum = Math.floor(Math.random() * 4)
const tk = tks[randomNum]  //随机数选择key
const TiandiMap_vec = new Tile({
  source: new XYZ({  //天地图矢量图层
    url: 'http://t3.tianditu.com/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=' + tk,
    wrapX: false
  }),
  visible: true,
  preload: Infinity
});
const TiandiMap_cva = new Tile({
  source: new XYZ({  //天地图矢量注记图层
    url: 'http://t4.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=' + tk,
    wrapX: false
  }),
  visible: true,
  preload: Infinity
});
const TiandiMap_img = new Tile({
  source: new XYZ({  //天地图影像图层
    url: 'http://t3.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + tk,
    wrapX: false
  }),
  visible: true,
  preload: Infinity
});
const TiandiMap_cia = new Tile({
  source: new XYZ({  //天地图影像注记图层
    url: 'http://t4.tianditu.com/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' + tk,
    wrapX: false
  }),
  visible: true,
  zIndex: 100,
  preload: Infinity
});

onMounted(() => {
  nextTick(() => {
    getPhotoData().then(res => {
      map = new Map({
        target: 'mapContainer', // 这里要确保ID与模板中的div一致
        layers: [
          TiandiMap_cia, TiandiMap_img
        ],
        controls: defaults({
          attributionOptions: {
            collapsible: false
          }
        }),
        view: new View({
          center: transform([120.9820, 23.74], "EPSG:4326", "EPSG:3857"),//将坐标从经度,纬度转换为不同的投影,默认为'EPSG：3857'。//视觉中心
          zoom: 8.5,
        }),
      });

      const features = res.map((point) => {
        const coordinates = [Number(point.longitude), Number(point.latitude)]
        const feature = new Feature({
          geometry: new Point(fromLonLat(coordinates)),
        });
        feature.setStyle(
            new Style({
              image: new Icon({
                anchor: [0.5, 1],
                src: mapPng, // 使用一个简单的图标
                scale: 0.05,
              }),
            })
        );
        feature.setId(point.id);
        return feature;
      });

      // 创建聚合源
      const clusterSource = new Cluster({
        distance: 10, // 聚合的距离，可以根据需要调整
        source: new VectorSource({
          features: features,
        }),
      });

      // 定义聚合层的样式
      const styleCache = {};
      const clusterLayer = new VectorLayer({
        source: clusterSource,
        style: function (feature) {
          const size = feature.get('features').length;
          let style = styleCache[size];
          if (!style) {
            if (size > 1) {
              // 聚合显示圆形
              style = new Style({
                image: new CircleStyle({
                  radius: 10,
                  fill: new Fill({
                    color: '#3399CC',
                  }),
                  stroke: new Stroke({
                    color: '#fff',
                    width: 2,
                  }),
                }),
                text: new Text({
                  text: size.toString(),
                  fill: new Fill({
                    color: '#fff',
                  }),
                }),
              });
            } else {
              // 非聚合单点显示原始图标
              const originalFeature = feature.get('features')[0];
              style = originalFeature.getStyle();
            }
            styleCache[size] = style;
          }
          return style;
        },
      });

      /*const vectorSource = new VectorSource({
        features: features,
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
      });*/

      //map.addLayer(vectorLayer);
      map.addLayer(clusterLayer);

      // 点击事件
      map.on('click', (event) => {
        showImage.value = true;
        // 首先重置所有 feature 的样式为 mapPng
        clusterSource.getFeatures().forEach((feature) => {
          feature.setStyle(
              new Style({
                image: new Icon({
                  anchor: [0.5, 1],
                  src: mapPng, // 重置为原始图标
                  scale: 0.05,
                }),
              })
          );
        });
        map.forEachFeatureAtPixel(event.pixel, (feature) => {
          feature.setStyle(
              new Style({
                image: new Icon({
                  anchor: [0.5, 1],
                  src: map1Png, // 使用一个简单的图标
                  scale: 0.05,
                }),
              })
          );
          const imageUrl = feature.values_.features[0].id_ as string;
          if (imageUrl) {
            // 缩小地图并移到左上角
            const mapEl = mapContainer.value;
            if (mapEl) {
              mapEl.style.width = '300px';
              mapEl.style.height = '200px';
              mapEl.style.position = 'absolute';
              mapEl.style.top = '10px';
              mapEl.style.left = '10px';
              map.updateSize();
            }
            getPanoData(imageUrl).then(res => {
              // 将文件流转换为 Blob 对象
              // 将二进制数据转换为 URL
              const blob = new Blob([res], { type: 'image/jpeg' });
              const imageUrl = URL.createObjectURL(blob);
              if (panoramaViewer) {
                // 如果全景视图已经初始化，更新全景图像
                panoramaViewer.setPanorama(imageUrl);
              } else {
                nextTick(() => {
                  // 否则初始化全景视图
                  panoramaViewer = new Viewer({
                    container: viewerContainer.value,
                    panorama: imageUrl,
                    navbar: [
                      'autorotate',
                      'zoom',
                      'move',
                      'caption',
                      'fullscreen',
                    ],
                  });
                })
              }
            })
          }
        });
      });
    })
  })
});

// 方法：返回地图
const returnToMap = () => {
  const mapEl = mapContainer.value;
  if (mapEl) {
    // 恢复地图大小和位置
    mapEl.style.width = '100%';
    mapEl.style.height = '100%';
    mapEl.style.position = 'relative';
    mapEl.style.top = '';
    mapEl.style.left = '';
    showImage.value = false; // 隐藏图片展示
    map.updateSize(); // 更新地图尺寸
  }
};

</script>

<style scoped>
#mapContainer {
  width: 100%;
  height: 100%;
  transition: all 0.3s ease-in-out;
  z-index: 9999999;
}

.image-viewer {
  position: relative;
  /*top: 0;*/
  /*left: 0;*/
  width: 100%;
  height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.full-image {
  /*max-width: 90%;
  max-height: 90%;*/
  width: 100%;
  height: 100%;
  border: 5px solid white;
}

.full-image, #viewer, .psv-container, .psv-canvas-container {
  width: 100%!important;
  height: 100%!important;
}

.return-button {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
}

.return-button:hover {
  background-color: #f0f0f0;
}
</style>