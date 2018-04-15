// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {KNNImageClassifier} from 'deeplearn-knn-image-classifier';
import * as dl from 'deeplearn';

// Number of classes to classify
const NUM_CLASSES = 10;
// Webcam Image size. Must be 227.
const IMAGE_SIZE = 227;
// K value for KNN
const TOPK = 10;

String.prototype.sprintf = function()
{
    var str = this + '';
    var args = Array.prototype.slice.call(arguments);

    var ph = true;
    if (str.indexOf('%s', 0) != -1) {
        ph = false;
    }

    if (args.length === 1) {
        if (ph) {
            return str.replace(/%1$s/g, args[0]);
        } else {
            return str.replace(/%s/g, args[0]);
        }
    } else {
        for (var i=0; i<args.length; i++) {
            var n = i + 1;
            if (ph) {
                str = str.replace('%'+n+'$s', args[i]);
            } else {
                str = str.replace('%s', args[i]);
            }
        }
    }
    return str;
}

const LOCALIZED_TEXT = {
  ja: {
    menu: "<a href=\"?lang=en\">English</a> | <a href=\"https://github.com/champierre/ml2scratch\">GitHub</a>",
    connect: "接続する",
    connection_id: "接続ID",
    blank_id_is_invalid: "接続IDを入力してください。",
    no_examples_added: "まだ学習していません",
    examples: "枚",
    train: '「分類%s」として学習する',
    clear: '「分類%s」をリセットする',
    help_text: "&uarr; <a href=\"http://scratchx.org/?url=https://champierre.github.io/ml2scratch/ml2scratch.js\" target=\"_blank\">拡張機能を読み込んだScratchX</a>のページを開いて、上記の接続IDを「ID: [ ]で接続する」ブロックにコピー&ペーストしてください。",
  },
  en: {
    menu: "<a href=\"?lang=ja\">日本語</a> | <a href=\"https://github.com/champierre/ml2scratch\">GitHub</a>",
    connect: "Connect",
    connection_id: "Connection ID",
    blank_id_is_invalid: "Blank ID is invalid.",
    no_examples_added: "No examples added",
    examples: "examples",
    train: 'Train %s',
    clear: 'Clear %s',
    help_text: "&uarr; Open <a href=\"http://scratchx.org/?url=https://champierre.github.io/ml2scratch/ml2scratch.js\" target=\"_blank\">ScratchX with extension loaded</a> and use this ID when you connect.",
  }
}

class I18n {
  constructor(){
    window.I18n = this;
  }

  static t(key, arg = '') {
    var lang = window.navigator.language;
    var vars = this.getUrlVars();
    if (vars['lang'] && vars['lang'].length > 0) {
      lang = vars['lang'];
    }
    if (lang == 'ja') {
      return LOCALIZED_TEXT['ja'][key].sprintf(arg);
    } else {
      return LOCALIZED_TEXT['en'][key].sprintf(arg);
    }
  }

  static getUrlVars() {
    var vars = [], max = 0, hash = "", array = "";
    var url = window.location.search;

    hash  = url.slice(1).split('&');
    max = hash.length;
    for (var i = 0; i < max; i++) {
        array = hash[i].split('=');
        vars.push(array[0]);
        vars[array[0]] = array[1];
    }
    return vars;
  }
}

class Main {
  constructor(){
    // Initiate variables
    this.infoTexts = [];
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;

    this.connId = undefined;

    // Initiate deeplearn.js math and knn classifier objects
    this.knn = new KNNImageClassifier(NUM_CLASSES, TOPK);

    const linkToOtherLangDiv = document.createElement('div');
    linkToOtherLangDiv.innerHTML = I18n.t("menu");
    document.body.appendChild(linkToOtherLangDiv);

    // Create video element that will contain the webcam image
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('playsinline', '');

    // Add video element to DOM
    document.body.appendChild(this.video);

    const div = document.createElement('div');

    const textField = document.createElement('input');
    textField.type = "text";
    textField.id = "conn_id";
    textField.placeholder = I18n.t("connection_id");
    textField.value = Math.random().toString(36).slice(-10);
    textField.addEventListener('click', ()=> {
      textField.select();
      document.execCommand("Copy");
    });
    div.appendChild(textField);

    const connectButton = document.createElement('button')
    connectButton.innerText = I18n.t('connect');
    div.appendChild(connectButton);
    document.body.appendChild(div);
    div.style.marginBottom = '10px';
    connectButton.addEventListener('click', ()=> {
      if(textField.value.length == 0) {
        // alert("Blank ID is invalid.");
        alert(I18n.t("blank_id_is_invalid"));
      } else {
        this.connect(textField.value);
      }
    });

    const helpDiv = document.createElement('div');
    helpDiv.style.fontSize = "14px";
    helpDiv.innerHTML = I18n.t("help_text");
    div.appendChild(helpDiv);

    // Create training buttons and info texts
    for(let i=0;i<NUM_CLASSES; i++){
      const div = document.createElement('div');
      document.body.appendChild(div);
      div.style.marginBottom = '10px';

      // Create training button
      const button = document.createElement('button')
      button.innerText = I18n.t('train', i);
      div.appendChild(button);

      // Listen for mouse events when clicking the button
      button.addEventListener('mousedown', () => this.training = i);
      button.addEventListener('mouseup', () => this.training = -1);

      // Create info text
      const infoText = document.createElement('span')
      infoText.innerText = " " + I18n.t('no_examples_added') + " ";
      infoText.style.fontSize = "14px";
      div.appendChild(infoText);
      this.infoTexts.push(infoText);

      // Create class clearing button
      const clearButton = document.createElement('button')
      clearButton.innerText = I18n.t('clear', i);
      div.appendChild(clearButton);

      clearButton.addEventListener('click', ()=> {
        this.knn.clearClass(i);
        this.infoTexts[i].style.fontWeight = 'normal';
        this.infoTexts[i].innerText = " " + I18n.t('no_examples_added') + " ";
        this.infoTexts[i].style.fontSize = "14px";
      });
    }


    // Setup webcam
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then((stream) => {
      this.video.srcObject = stream;
      this.video.width = IMAGE_SIZE;
      this.video.height = IMAGE_SIZE;

      this.video.addEventListener('playing', ()=> this.videoPlaying = true);
      this.video.addEventListener('paused', ()=> this.videoPlaying = false);
    })

    // Load knn model
    this.knn.load()
    .then(() => this.start());
  }

  start(){
    if (this.timer) {
      this.stop();
    }
    this.video.play();
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }

  stop(){
    this.video.pause();
    cancelAnimationFrame(this.timer);
  }

  animate(){
    if(this.videoPlaying){
      // Get image data from video element
      const image = dl.fromPixels(this.video);

      // Train class if one of the buttons is held down
      if(this.training != -1){
        // Add current image to classifier
        this.knn.addImage(image, this.training)
      }

      // If any examples have been added, run predict
      const exampleCount = this.knn.getClassExampleCount();
      if(Math.max(...exampleCount) > 0){
        this.knn.predictClass(image)
        .then((res)=>{
          for(let i=0;i<NUM_CLASSES; i++){
            // Make the predicted class bold
            if(res.classIndex == i){
              this.infoTexts[i].style.fontWeight = 'bold';
              if(this.ws && this.ws.readyState === WebSocket.OPEN){
                this.ws.send(JSON.stringify({action: 'predict', conn_id: this.connId, value: res.classIndex}));
              }
            } else {
              this.infoTexts[i].style.fontWeight = 'normal';
            }

            // Update info text
            if(exampleCount[i] > 0){
              this.infoTexts[i].innerText = ` ${exampleCount[i]} ${I18n.t('examples')} - ${res.confidences[i]*100}% `
            }
          }
        })
        // Dispose image when done
        .then(()=> image.dispose())
      } else {
        image.dispose()
      }
    }
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }

  connect(connId) {
    this.ws = new WebSocket('wss://ml2scratch-helper.glitch.me/');

    this.connId = connId;
  }
}

window.addEventListener('load', () => {
  new I18n();
  new Main();
});
