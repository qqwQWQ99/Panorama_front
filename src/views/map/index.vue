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
import {Style, Fill, Stroke, Icon} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { singleClick } from 'ol/events/condition';
import { Point } from "ol/geom";

const viewerContainer = ref<HTMLDivElement | null>(null);
const mapContainer = ref<HTMLDivElement | null>(null);
const showImage = ref(false);
let map: Map;
// 全景视图
let panoramaViewer = null;

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

const imgData = [
  {
    coordinates: [120.87820709, 22.29058715],
    imageUrl: '/2021_05_00_22.29058715_120.87820709_19_276_CbSUk_bUoPPGvPBaBrjDTg.jpg',
  },
  {
    coordinates: [120.87848180, 22.29062710],
    imageUrl: '/2021_05_00_22.29062710_120.87848180_19_281_8nOU63bTcGTCjfjPQTP-BA.jpg',
  },
  {
    coordinates: [120.87485099, 22.29347633],
    imageUrl: '/2021_05_00_22.29347633_120.87485099_23_101_8DJibfJNWzdptcLuJMZo8w.jpg',
  },
  {
    coordinates: [120.86731876, 22.29380041],
    imageUrl: '/2021_05_00_22.29380041_120.86731876_36_106_DoV9ETctyedqvCBslk2uTQ.jpg',
  },
  {
    coordinates: [120.88872026, 22.30041688],
    imageUrl: '/2021_11_00_22.30041688_120.88872026_15_357_a42Zv2sBc-X_uREo2FYrqQ.jpg',
  },
]

onMounted(() => {
  map = new Map({
    target: 'mapContainer', // 这里要确保ID与模板中的div一致
    layers: [
      TiandiMap_cva, TiandiMap_vec
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

  const features = imgData.map((point) => {
    const feature = new Feature({
      geometry: new Point(fromLonLat(point.coordinates)),
    });
    feature.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // 使用一个简单的图标
            scale: 0.05,
          }),
        })
    );
    feature.setId(point.imageUrl);
    return feature;
  });

  const vectorSource = new VectorSource({
    features: features,
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
  });

  map.addLayer(vectorLayer);

  // 点击事件
  map.on('click', (event) => {
    showImage.value = true;
    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const imageUrl = feature.getId() as string;
      console.log("imageUrl", imageUrl)
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
      }
    });
  });

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