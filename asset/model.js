class model {
  constructor(params = {
    container: '',
    labelContainer: '',
    menuContainer: ''
  }) {
    this.raycaster
    this.scene

    this.$dom = params.container
    this.$label = params.labelContainer
    this.$nav = params.menuContainer

    this.sceneWidth = Number(this.getStyle(this.$dom,'width').replace('px',''))
    this.sceneHeight = Number(this.getStyle(this.$dom,'height').replace('px',''))
    // model data
    this.terrainMesh = null
    this.rooms = null
    this.whiteBuilding = null
    this.buildingMesh = null
    this.buildingRoofMesh = null
    // -----------
    this.roofEdgeHelper = null
    this.directionalLight = null
    this.controls = null
    // --------

    this.appOverLocation = null//当前悬停的标签
    this.appActiveLocation = null//当前选中的标签

    this.initScene()

    this.loadModel().then(() => {
      console.log('model load down')
      this.addObjects()
      this.addControls()

      this.setLabels()
      this.setNav()

      this.setOpacity(.5)
      this.update()
    })
  }

  initScene() {

    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, this.sceneWidth / this.sceneHeight, 1, 300);

    this.camera.position.x = -5;
    this.camera.position.y = 21.5;
    this.camera.position.z = -42;

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.sceneWidth, this.sceneHeight);
    this.renderer.setClearColor(0x3363A7);

    this.$dom.appendChild(this.renderer.domElement);

  }

// -------------------------------------------- load model-------------------------------------------
  loadModel() {
    this.loadBuildingModel()
    this.loadWhiteBuildingModel()
    this.loadRooms()
    this.loadTerrain()

    return new Promise((resolve, reject) => {
      var t = setInterval(() => {
        if (this.terrainMesh && this.rooms && this.whiteBuilding && this.buildingMesh && this.buildingRoofMesh) {
          clearInterval(t)
          resolve()
        }
      }, 500)
    })
  }

  loadBuildingModel() {
    let that = this
    var loader = new THREE.JSONLoader();
    loader.setTexturePath('obj/building/maps/')
    loader.load(
      'obj/building/c2.js',
      function (geometry, materials) {
        var material = new THREE.MultiMaterial(materials);
        for (var i = 0; i < materials.length; i++) {
          materials[i].transparent = true;
          materials[i].color = new THREE.Color(0xD8EAFF);
        }

        that.scaleGeometry(geometry);

        that.buildingMesh = new THREE.Mesh(geometry, material);
        that.buildingMesh.geometry.computeBoundingSphere();
      }
    );

    var loader = new THREE.JSONLoader();
    loader.load(
      'obj/building/wuding.js',
      function (geometry, materials) {
        var material = new THREE.MultiMaterial(materials);
        for (var i = 0; i < materials.length; i++) {
          materials[i] = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            polygonOffset: true,
            polygonOffsetFactor: 1, // positive value pushes polygon further away
            polygonOffsetUnits: 1
          });
        }

        that.scaleGeometry(geometry);

        that.buildingRoofMesh = new THREE.Mesh(geometry, material);
      },
    );

  }

  loadWhiteBuildingModel() {
    let that = this
    var loader = new THREE.JSONLoader();
    loader.setTexturePath('obj/building/maps/')
    loader.load(
      'obj/whiteBuilding/whiteBuilding.js',
      function (geometry, materials) {
        var material = new THREE.MeshPhongMaterial({
          color: 0xffffff
        });
        that.scaleGeometry(geometry);

        var whiteBuildingMesh = new THREE.Mesh(geometry, material);
        that.whiteBuilding = new InteractiveItem(whiteBuildingMesh,
          '运维中心', 'whiteBuilding');
        that.whiteBuilding.setEmissiveDefault(0x333333);
        that.whiteBuilding.unmark();
      },
    );
  }

  loadRooms() {
    let that = this
    var roomData = platformData;
    let rooms = []
    for (var i = 0; i < roomData.length; i++) {
      loadRoom(roomData[i]);
    }
    this.rooms = rooms

    function loadRoom(data) {
      var name = data.name,
        slug = data.slug,
        loader = new THREE.JSONLoader();

      loader.load(
        data.objRoom,
        function (geometry, materials) {
          var material = new THREE.MeshPhongMaterial({
            color: 0xffffff
          });

          that.scaleGeometry(geometry);

          var mesh = new THREE.Mesh(geometry, material);
          var room = new InteractiveItem(mesh, name, slug);
          room.setEmissiveDefault(0x333333);
          room.unmark();

          rooms.push(room);
        },
      );
    }

  }

  loadTerrain() {
    let that = this
    var loader = new THREE.JSONLoader();
    loader.setTexturePath('obj/terrain/maps/')
    loader.load(
      'obj/terrain/dixing.js',
      function (geometry, materials) {
        for (var i = 0; i < materials.length; i++) {
          materials[i].transparent = true;
          // materials[i].color=  new THREE.Color( 0x3363A7 );
        }
        var material = new THREE.MultiMaterial(materials);

        that.scaleGeometry(geometry);

        that.terrainMesh = new THREE.Mesh(geometry, material);

      },
    );

  }

  update() {
    this.modelUpdate()
    this.labelUpdate()
    requestAnimationFrame(this.update.bind(this))
  }

// ---------------------------------------------END load model ----------------------------------------------
  scaleGeometry(geometry, scaleval) {
    if (scaleval) {
      scaleval = scaleval;
    } else {
      scaleval = 0.2
    }

    // centers the imported models into the scene
    var transform = new THREE.Matrix4(),
      scale = new THREE.Matrix4(),
      translate = new THREE.Matrix4();
    scale.makeScale(scaleval, scaleval, scaleval);
    translate.makeTranslation(32.57, 0, 30);
    transform.multiplyMatrices(scale, translate);

    geometry.applyMatrix(transform);

  }

  addObjects() {
    let scene = this.scene
    // lights
    var ambient = new THREE.AmbientLight(0x333333);
    scene.add(ambient);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(0, 0, 0.1);
    scene.add(this.directionalLight);

    // building
    scene.add(this.buildingMesh);

    // white building
    scene.add(this.whiteBuilding.object3D);

    // line helper (building)
    var edgeHelper = new THREE.EdgesHelper(this.buildingMesh, 0x000000, 80);
    edgeHelper.material.transparent = true;
    edgeHelper.material.opacity = 0.3;
    edgeHelper.material.linewidth = 1;
    scene.add(edgeHelper);

    // line helper (white building)
    var whiteBuildingEdgeHelper = new THREE.EdgesHelper(this.whiteBuilding.object3D, 0x000000, 80);
    whiteBuildingEdgeHelper.material.transparent = true;
    whiteBuildingEdgeHelper.material.opacity = 0.3;
    whiteBuildingEdgeHelper.material.linewidth = 1;
    scene.add(whiteBuildingEdgeHelper);

    // roof
    var materials = this.buildingRoofMesh.material.materials;
    for (var i = 0; i < materials.length; i++) {
      materials[i].transparent = true;
    }
    this.buildingRoofMesh.renderOrder = 1;
    scene.add(this.buildingRoofMesh);

    // line helper (roof)
    let roofEdgeHelper = new THREE.EdgesHelper(this.buildingRoofMesh, 0x000000, 20);
    roofEdgeHelper.material.transparent = true;
    roofEdgeHelper.material.opacity = 0.2;
    roofEdgeHelper.material.linewidth = 1;
    roofEdgeHelper.renderOrder = 1;

    this.roofEdgeHelper = roofEdgeHelper
    scene.add(this.roofEdgeHelper);

    // rooms
    let roomsGroup = new THREE.Object3D();

    for (var i = 0; i < this.rooms.length; i++) {
      roomsGroup.add(this.rooms[i].object3D);
    }

    scene.add(roomsGroup);

    // terrain
    scene.add(this.terrainMesh);

  }

  addControls() {

    var interaciveEl = this.$label
    // controls
    let controls = new THREE.OrbitControls(this.camera, interaciveEl);
    controls.scaleFactor = 0.04;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.2;
    controls.enablePan = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.01;
    controls.maxPolarAngle = 1.5;
    controls.minPolarAngle = 0;
    controls.enableKeys = true;
    controls.minDistance = 22;
    controls.maxDistance = 1000;
    this.controls = controls
    // this.controls.update()
  }

  modelUpdate() {
    this.controls.update()

    this.directionalLight.position.copy(this.camera.position);

    this.renderer.render(this.scene, this.camera)
  }

  setSize() {

    let sceneWidth =  Number(this.getStyle(this.$dom,'width').replace('px',''))
    let sceneHeight = Number(this.getStyle(this.$dom,'height').replace('px',''))

    this.camera.aspect = sceneWidth / sceneHeight;
    this.camera.setViewOffset((sceneWidth + sceneWidth / 6), (sceneHeight - sceneHeight / 4), 0, 0, sceneWidth, sceneHeight);
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(sceneWidth, sceneHeight);

  }

  setOpacity(val) {

    // building
    var materials = this.buildingMesh.material.materials;
    for (var i = 0; i < materials.length; i++) {
      materials[i].opacity = 0.1 + val * (1 - 0.15); // remap from [0.0-1.0] to [0.1-1.0]
      materials[i].needsUpdate = true;
    }

    // roof
    materials = this.buildingRoofMesh.material.materials;
    for (var i = 0; i < materials.length; i++) {
      materials[i].opacity = val * val * 1.1; // exponential curve
      materials[i].needsUpdate = true;
    }
    this.roofEdgeHelper.material.opacity = val * val * 0.2;  // exponential curve
    this.roofEdgeHelper.material.needsUpdate = true;

    // terrain
    materials = this.terrainMesh.material.materials;
    for (var i = 0; i < materials.length; i++) {
      materials[i].opacity = val * val + 0.05;   // exponential curve
      materials[i].needsUpdate = true;
    }
  }

  // ---------------------------------------- set label ------------------------------------------------------
  setLabels() {
    for (var i = 0; i < this.rooms.length; i++) {
      this.$label.appendChild(this.rooms[i].$label)
    }
    this.$label.appendChild(this.whiteBuilding.$label)

    this.setLabelsEvent()
  }

  setLabelsEvent() {
    let $labels = this.$label.querySelectorAll('.label')
    let that = this

    $labels.forEach((label) => {
      label.addEventListener('mouseenter', function () {
        that.haldleMouseenter(this)
      })
    })

    $labels.forEach((label) => {
      label.addEventListener('mouseleave', function () {
        that.handleMouseleave(this)
      })
    })
  }

  labelUpdate() {

    var prisonMesh = this.buildingMesh,
      boundingSphereRadius = prisonMesh.geometry.boundingSphere.radius,
      buildingCenter = prisonMesh.position.clone(),
      rooms = this.rooms;

    var appOverLocation = this.appOverLocation,//当前悬停的标签
      appActiveLocation = this.appActiveLocation;//当前选中的标签


    // update all room labels
    for (var i = 0, max = rooms.length; i < max; i++) {

      var room = rooms[i],
        roomSlug = room.getSlug(),
        anchor = room.getCenter(),
        screenCoord = this.toScreenXY(anchor),

        distanceToAnchor = this.camera.position.distanceTo(anchor);
      let distanceToCenter = this.camera.position.distanceTo(buildingCenter),
        farZ = distanceToCenter + boundingSphereRadius,
        nearZ = distanceToCenter - boundingSphereRadius,
        pct = (distanceToAnchor - nearZ) / (farZ - nearZ);
      pct = 1 - pct;

      // opacity won't be affected by disatnce if this room is active or selected
      var opacity = (roomSlug !== appActiveLocation) ? (0.1 + pct) : 0.8;
      opacity = (roomSlug !== appOverLocation) ? opacity : 0.8;

      // testing scaling
      var targetScale = (roomSlug === appOverLocation || roomSlug === appActiveLocation) ? 1.11 : 1;
      // ease
      room.scale += (targetScale - room.scale) * 0.2;

      room.$label.style.transform = 'translate3d(' + screenCoord.x + 'px,' + screenCoord.y + 'px,0px) scale(' + room.scale + ',' + room.scale + ')'
      room.$label.style.opacity = opacity
      room.$label.style.zIndex = Math.floor(pct * 100)

    }

    // update white building labels
    var whiteBuilding = this.whiteBuilding,
      whiteBuildingSlug = whiteBuilding.getSlug(),
      anchor = whiteBuilding.getCenter(),
      screenCoord = this.toScreenXY(anchor);

    var targetScale = (whiteBuildingSlug === appOverLocation || whiteBuildingSlug === appActiveLocation) ? 1.11 : 1;
    // ease
    whiteBuilding.scale += (targetScale - whiteBuilding.scale) * 0.2;

    var transform = 'translate3d(' + screenCoord.x + 'px,'
      + screenCoord.y + 'px,0px) scale(' + whiteBuilding.scale
      + ',' + whiteBuilding.scale + ')';

    whiteBuilding.$label.style.transform = transform
    whiteBuilding.$label.style.opacity = .7
    whiteBuilding.$label.style.zIndex = 60

  }

  toScreenXY(position) {
    // 这里有点浪费
    let sceneWidth = Number(this.getStyle(this.$dom,'width').replace('px',''))
    let sceneHeight = Number(this.getStyle(this.$dom,'height').replace('px',''))
    var pos = position.clone().project(this.camera)
    return {
      x: (pos.x + 1) * sceneWidth / 2,
      y: (-pos.y + 1) * sceneHeight / 2,
      z: pos.z
    }

  }
  // -----------------------------------------End set label --------------------------------------------------

  setNav(){
    let html = ''
    for (var i = 0; i < this.rooms.length; i++) {
      html += `<div class="highlight-model-menu-item" data-id="${this.rooms[i].slug}">${this.rooms[i].name}</div>`
    }
    html += `<div class="highlight-model-menu-item" data-id="${this.whiteBuilding.slug}">${this.whiteBuilding.name}</div>`
    this.$nav.innerHTML = html
    this.setNavEvent()
  }
  setNavEvent(){
    let $navs = this.$nav.querySelectorAll('.highlight-model-menu-item')
    let that = this

    $navs.forEach((nav) => {
      nav.addEventListener('mouseenter', function () {
        that.haldleMouseenter(this)
      })
    })

    $navs.forEach((nav) => {
      nav.addEventListener('mouseleave', function () {
        that.handleMouseleave(this)
      })
    })
  }

  haldleMouseenter(dom){
    let slug = dom.dataset.id
    dom.classList.add('over')

    if(dom.classList.contains('label')){
      let d = [].find.call(this.$nav.querySelectorAll('.highlight-model-menu-item'),(item) => item.dataset.id == slug)
      d.classList.add('over')
    }else{
      let d = [].find.call(this.$label.querySelectorAll('.label'),(item) => item.dataset.id == slug)
      d.classList.add('over')
    }

    if (slug == 'whiteBuilding') {
      this.whiteBuilding.mark()
    } else {
      this.rooms.find((room) => room.slug == slug).mark()
    }

    this.appOverLocation = slug
  }
  handleMouseleave(dom){
    let slug = dom.dataset.id
    dom.classList.remove('over')

    if(dom.classList.contains('label')){
      let d = [].find.call(this.$nav.querySelectorAll('.highlight-model-menu-item'),(item) => item.dataset.id == slug)
      d.classList.remove('over')
    }else{
      let d = [].find.call(this.$label.querySelectorAll('.label'),(item) => item.dataset.id == slug)
      d.classList.remove('over')
    }

    if (slug == 'whiteBuilding') {
      this.whiteBuilding.unmark()
    } else {
      this.rooms.find((room) => room.slug == slug).unmark()
    }
    this.appOverLocation = null
  }

  getStyle(el, ruleName) {
    return getComputedStyle(el, null).getPropertyValue(ruleName)
  }
}

let m = new model({
  container: document.querySelector('#layer-prison .gl'),
  labelContainer: document.querySelector('#layer-prison .labels'),
  menuContainer: document.querySelector('#layer-prison .highlight-model-menu')
})

window.onresize = function () {
  m.setSize()
}

let range = document.querySelector('#range')
range.onchange = function () {
  m.setOpacity(this.value / 100)
}
