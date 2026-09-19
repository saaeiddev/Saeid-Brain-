const fs = require('fs');
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

// Add production GLTF + Draco loaders.
html = html.replace(
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\n    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';"
);

const start = html.indexOf('    // ------- Procedural anatomical brain -------');
let end = html.indexOf('    // Flat neural orbit: perfectly level around the brain, never tilted.');
if (end < 0) end = html.indexOf('    // Neural orbit particles');
if (start < 0 || end < 0 || end <= start) throw new Error('Brain block markers not found');

const replacement = `    // ------- High-detail anatomical brain asset -------
    // Anatomical asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0.
    // Source: https://github.com/itayinbarr/brainproject
    const brain = new THREE.Group();
    brain.visible = false; brain.scale.setScalar(.01); brain.position.set(0,-.18,0); scene.add(brain);

    const lobeData = [
      { id:'frontal', name:'Frontal Lobe', dest:'Personal Website', url:'https://amirsaeiddehghan.ir/', color:0x39ddff },
      { id:'parietal', name:'Parietal Lobe', dest:'Second Personal Website', url:'https://saaeiddev.github.io/Amir-Saeid-Dehghan-Website-2-/', color:0xa968ff },
      { id:'temporal', name:'Temporal Lobe', dest:'Behance · Amir Saeid', url:'https://www.behance.net/amirsaeid', color:0xff5db3 },
      { id:'occipital', name:'Occipital Lobe', dest:'YouTube · @saeidworld', url:'https://www.youtube.com/@saeidworld', color:0xffb747 }
    ];
    const interactive = [];
    let anatomicalModel = null;

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    function lobeForObject(obj){
      const e = obj.userData || {};
      const text = [obj.name, e.bx_label, e.bx_region, e.bx_cat, e.bx_id].filter(Boolean).join(' ').toLowerCase();
      if(text.includes('frontal')) return lobeData[0];
      if(text.includes('parietal')) return lobeData[1];
      if(text.includes('temporal')) return lobeData[2];
      if(text.includes('occipital')) return lobeData[3];
      return null;
    }

    const BRAIN_MODEL_URL = 'https://raw.githubusercontent.com/itayinbarr/brainproject/main/brain-atlas/models/brain.glb';
    gltfLoader.load(BRAIN_MODEL_URL, gltf => {
      anatomicalModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(anatomicalModel);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const fit = 4.25 / Math.max(size.x,size.y,size.z);
      anatomicalModel.scale.setScalar(fit);
      anatomicalModel.position.copy(center).multiplyScalar(-fit);
      anatomicalModel.rotation.set(-0.08, -0.34, 0.02);

      anatomicalModel.traverse(obj => {
        if(!obj.isMesh) return;
        obj.castShadow = true; obj.receiveShadow = true;
        const lobe = lobeForObject(obj);
        if(lobe){
          obj.userData.portfolioLobe = lobe;
          obj.userData.id = lobe.id;
          obj.userData.name = lobe.name;
          obj.userData.dest = lobe.dest;
          obj.userData.url = lobe.url;
          obj.userData.color = lobe.color;
          interactive.push(obj);
          const base = new THREE.Color(lobe.color);
          const old = obj.material;
          obj.material = new THREE.MeshPhysicalMaterial({
            color: base.clone().lerp(new THREE.Color(0xd8a8a8), .62), map: old?.map || null, normalMap: old?.normalMap || null,
            roughness: .48, metalness: 0, clearcoat: .22, clearcoatRoughness: .45, emissive: base, emissiveIntensity: .12, transparent: false
          });
        } else if(obj.material){
          const old = obj.material; obj.material = old.clone(); obj.material.roughness = Math.max(.4, obj.material.roughness ?? .5);
        }
      });
      brain.add(anatomicalModel);
    }, undefined, err => {
      console.error('Anatomical brain model failed to load', err);
      document.querySelector('.brain-title p').textContent = 'Anatomical model could not load. Please refresh.';
    });

    // ------- High-quality human body + peripheral nervous system -------
    // Anatomical skin model: BodyParts3D via human-body-simulator.
    // The body is a separate visual layer; the portfolio brain and all lobe links remain untouched.
    const bodyLayer = new THREE.Group();
    bodyLayer.name = 'deployed-human-body-layer';
    brain.add(bodyLayer);

    const nerveLayer = new THREE.Group();
    nerveLayer.name = 'deployed-peripheral-nervous-system';
    brain.add(nerveLayer);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color:0x8db7cf,
      roughness:.46,
      metalness:0,
      transparent:true,
      opacity:.34,
      clearcoat:.18,
      clearcoatRoughness:.50,
      emissive:0x17394a,
      emissiveIntensity:.18,
      depthWrite:false,
      side:THREE.DoubleSide
    });

    const nerveCoreMaterial = new THREE.MeshBasicMaterial({
      color:0xedffff,
      transparent:true,
      opacity:1,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    const nerveMaterial = new THREE.MeshBasicMaterial({
      color:0x54e5ff,
      transparent:true,
      opacity:.96,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    const nerveGlowMaterial = new THREE.MeshBasicMaterial({
      color:0x27d7ff,
      transparent:true,
      opacity:.26,
      depthWrite:false,
      blending:THREE.AdditiveBlending
    });

    function addNerve(points,radius=.018,material=nerveMaterial){
      const curve = new THREE.CatmullRomCurve3(points,false,'catmullrom',.45);
      const halo = new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(36,points.length*20),radius*3.0,8,false),
        nerveGlowMaterial
      );
      halo.renderOrder = 6;
      nerveLayer.add(halo);

      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve,Math.max(36,points.length*20),radius,10,false),
        material
      );
      tube.renderOrder = 7;
      nerveLayer.add(tube);
      return tube;
    }

    function addNerveTip(p,r=.026){
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(r,14,14),
        new THREE.MeshBasicMaterial({
          color:0xeaffff,
          transparent:true,
          opacity:.96,
          depthWrite:false,
          blending:THREE.AdditiveBlending
        })
      );
      tip.position.copy(p);
      tip.renderOrder = 8;
      nerveLayer.add(tip);
    }

    // Central nervous continuation underneath the anatomical brain.
    addNerve([
      new THREE.Vector3(.10,-1.16,.24),
      new THREE.Vector3(.06,-1.38,.27),
      new THREE.Vector3(.03,-1.62,.29),
      new THREE.Vector3(.01,-1.88,.31),
      new THREE.Vector3(0,-2.15,.32),
      new THREE.Vector3(0,-2.43,.33),
      new THREE.Vector3(0,-2.72,.34)
    ],.050,nerveCoreMaterial);

    // Spinal branches through the trunk.
    for(let i=0;i<8;i++){
      const y=-1.45-i*.16;
      const reach=.35+i*.045;
      [-1,1].forEach(side=>{
        addNerve([
          new THREE.Vector3(0,y,.31),
          new THREE.Vector3(side*.14,y-.01,.34),
          new THREE.Vector3(side*.29,y-.025,.37),
          new THREE.Vector3(side*reach,y-.04,.39)
        ],.012);
      });
    }

    function addArmNerves(side){
      const shoulder = new THREE.Vector3(side*.70,-1.26,.37);
      const upper = new THREE.Vector3(side*.76,-1.56,.40);
      const elbow = new THREE.Vector3(side*.78,-1.85,.42);
      const fore = new THREE.Vector3(side*.78,-2.14,.44);
      const wrist = new THREE.Vector3(side*.76,-2.40,.46);
      const palm = new THREE.Vector3(side*.75,-2.54,.47);

      addNerve([
        new THREE.Vector3(side*.05,-1.22,.28),
        new THREE.Vector3(side*.26,-1.23,.31),
        new THREE.Vector3(side*.48,-1.24,.34),
        shoulder
      ],.028,nerveCoreMaterial);

      addNerve([shoulder,upper,elbow,fore,wrist,palm],.022,nerveCoreMaterial);

      addNerve([
        shoulder.clone().add(new THREE.Vector3(side*.035,.03,.025)),
        upper.clone().add(new THREE.Vector3(side*.03,.02,.04)),
        elbow.clone().add(new THREE.Vector3(side*.025,.01,.045)),
        fore.clone().add(new THREE.Vector3(side*.02,.01,.04)),
        wrist.clone().add(new THREE.Vector3(side*.015,.005,.025))
      ],.010);

      addNerve([
        shoulder.clone().add(new THREE.Vector3(-side*.03,-.025,-.02)),
        upper.clone().add(new THREE.Vector3(-side*.025,-.02,-.035)),
        elbow.clone().add(new THREE.Vector3(-side*.02,-.01,-.04)),
        fore.clone().add(new THREE.Vector3(-side*.015,-.01,-.035)),
        wrist.clone().add(new THREE.Vector3(-side*.01,-.005,-.025))
      ],.010);

      // Five digital nerve paths to the fingertips.
      const offsets=[.105,.052,0,-.052,-.105];
      const lengths=[.16,.20,.22,.20,.16];
      offsets.forEach((off,index)=>{
        const base=new THREE.Vector3(palm.x+side*.025,palm.y+off,palm.z+.005);
        const tip=new THREE.Vector3(
          base.x+side*lengths[index],
          base.y+off*.16,
          base.z+.02
        );
        addNerve([
          palm,
          new THREE.Vector3(palm.x+side*.035,palm.y+off*.46,palm.z+.012),
          base,
          tip
        ],.0075);
        addNerveTip(tip,.021);
      });

      const thumbBase=new THREE.Vector3(palm.x+side*.04,palm.y-.095,palm.z+.015);
      const thumbTip=new THREE.Vector3(palm.x+side*.18,palm.y-.18,palm.z+.035);
      addNerve([palm,thumbBase,thumbTip],.008);
      addNerveTip(thumbTip,.023);
    }

    addArmNerves(-1);
    addArmNerves(1);

    const BODY_MODEL_URL = 'https://cdn.jsdelivr.net/gh/yamz8/human-body-simulator@main/public/models/anatomy-skin.glb';
    gltfLoader.load(BODY_MODEL_URL, gltf => {
      const body = gltf.scene;
      body.name = 'bodyparts3d-human-skin';

      body.updateMatrixWorld(true);
      const sourceBox = new THREE.Box3().setFromObject(body);
      const sourceSize = sourceBox.getSize(new THREE.Vector3());

      // Fill the current brain view vertically while keeping the head behind the portfolio brain.
      const targetHeight = 5.70;
      const scale = targetHeight / Math.max(sourceSize.y,.0001);
      body.scale.setScalar(scale);
      body.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(body);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

      body.position.x -= scaledCenter.x;
      body.position.y += 2.72 - scaledBox.max.y;
      body.position.z += .22 - scaledCenter.z;

      body.traverse(obj => {
        if(!obj.isMesh) return;
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.renderOrder = 2;
        obj.material = bodyMaterial.clone();
      });

      bodyLayer.add(body);
    }, undefined, err => {
      console.error('Human anatomy model failed to load', err);
    });

    // Attribution for the deployed anatomical body asset.
    console.info('Human body: BodyParts3D, Database Center for Life Science, CC BY-SA 2.1 Japan.');

`;
html = html.slice(0,start) + replacement + html.slice(end);
html = html.replace("        if(hover){ hover.material.emissiveIntensity=.34; hover.scale.multiplyScalar(1/1.035); }", "        if(hover){ hover.material.emissiveIntensity=.12; hover.scale.multiplyScalar(1/1.012); }");
html = html.replace("        if(hover){ hover.material.emissiveIntensity=1.15; hover.scale.multiplyScalar(1.035); const d=hover.userData; selectedData=d;", "        if(hover){ hover.material.emissiveIntensity=.72; hover.scale.multiplyScalar(1.012); const d=hover.userData.portfolioLobe || hover.userData; selectedData=d;");
html = html.replace("if(hit){ const d=hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }", "if(hit){ const d=hit.object.userData.portfolioLobe || hit.object.userData; window.open(d.url,'_blank','noopener,noreferrer'); }");

// The source now owns the refined pen animation and the horizontal orbit.
 // Remove only the brain group's visual roll so the orbit stays perfectly level in screen/world space.
html = html.replace("brain.rotation.z = Math.sin(t*.45)*.016;", "brain.rotation.z = 0;");

html = html.replace('</body>', '<!-- Anatomical brain asset: BrainProject / Z-Anatomy + BodyParts3D, CC BY-SA 4.0. https://github.com/itayinbarr/brainproject -->\n</body>');
fs.writeFileSync(path, html);
console.log('Applied anatomical brain, corrected centering, rotating pen, and level horizontal neural orbit.');
