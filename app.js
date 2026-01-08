const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"
const FILL = "#11aa33"

game.width = 800
game.height = 800

const ctx = game.getContext("2d")

function clear(){
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, game.width, game.height)
}

function screen(p){
    return { x: (p.x+1)*0.5*game.width, y: (1-(p.y+1)*0.5)*game.height }
}

function project({x, y, z}){
    return { x:x/z, y:y/z, z }
}

function translate({x, y, z}, t){
    return { x:x+t.x, y:y+t.y, z:z+t.z }
}

function translate_z({x, y, z}, dz){
    return { x, y, z:z+dz }
}

function rotate_xz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x:x*c-z*s, y, z:x*s+z*c }
}

function rotate_yz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x, y:y*c-z*s, z:y*s+z*c }
}

const camera = { pos:{x:0,y:0,z:-3}, yaw:0, pitch:0 }

function to_camera(p){
    let v = translate(p, { x:-camera.pos.x, y:-camera.pos.y, z:-camera.pos.z })
    v = rotate_xz(v, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return v
}

let drawLines = true
document.getElementById("toggleLines").addEventListener("click", ()=>drawLines=!drawLines)

function draw_textured_triangle(ctx, img, p0, p1, p2, uv0, uv1, uv2) {
    const x0 = p0.x, y0 = p0.y
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y

    const u0 = uv0.x * img.width, v0 = uv0.y * img.height
    const u1 = uv1.x * img.width, v1 = uv1.y * img.height
    const u2 = uv2.x * img.width, v2 = uv2.y * img.height

    const denom = (u0*(v1-v2) + u1*(v2-v0) + u2*(v0-v1))
    if(denom === 0) return

    const a = ((x0*(v1-v2) + x1*(v2-v0) + x2*(v0-v1)))/denom
    const b = ((y0*(v1-v2) + y1*(v2-v0) + y2*(v0-v1)))/denom
    const c = ((x0*(u2-u1) + x1*(u0-u2) + x2*(u1-u0)))/denom
    const d = ((y0*(u2-u1) + y1*(u0-u2) + y2*(u1-u0)))/denom
    const e = x0 - a*u0 - c*v0
    const f = y0 - b*u0 - d*v0

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.closePath()
    ctx.clip()

    ctx.setTransform(a, b, c, d, e, f)
    ctx.drawImage(img, 0, 0)
    ctx.setTransform(1,0,0,1,0,0)
    ctx.restore()
}

function draw_polygon(points, uvs, texture){
    if(texture && uvs){
        for(let i=0;i<points.length-2;i++){
            draw_textured_triangle(
                ctx,
                texture,
                points[0], points[i+1], points[i+2],
                uvs[0], uvs[i+1], uvs[i+2]
            )

            // ctx.beginPath();
            // ctx.moveTo(points[0].x, points[0].y);
            // ctx.lineTo(points[i+1].x, points[i+1].y);
            // ctx.lineTo(points[i+2].x, points[i+2].y);
            // ctx.closePath();
            // ctx.fillStyle = FILL;
            // ctx.fill();
        }
    } else {
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y)
        ctx.closePath()
        ctx.fillStyle = FILL
        ctx.fill()
    }

    if(drawLines){
        ctx.strokeStyle = FOREGROUND
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y)
        ctx.closePath()
        ctx.stroke()
    }
}


function triangulate(face){
    const tris = []
    for(let i=1;i<face.length-1;i++) tris.push([face[0], face[i], face[i+1]])
    return tris
}

const figures = []

function add_cube(center, s){
    const h=s/2
    const vs=[
        {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
        {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
    ]

    const faces=[
        [0,1,2,3],
        [4,5,6,7],
        [0,4,5,1],
        [3,7,6,2],
        [1,5,6,2],
        [0,4,7,3]
    ]

    const tris=[]
    for(const f of faces){
        const uv=[
            {x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}
        ]
        tris.push(
            {indices:[f[0],f[1],f[2]], uvs:[uv[0],uv[1],uv[2]]},
            {indices:[f[0],f[2],f[3]], uvs:[uv[0],uv[2],uv[3]]}
        )
    }

    figures.push({center,vs,faces:tris})
}

function add_pyramid(center,s,h){
    const hs=s/2
    const hh = h / 2

    const vs=[
        {x:-hs,y:-hh,z:-hs},
        {x: hs,y:-hh,z:-hs},
        {x: hs,y:-hh,z: hs},
        {x:-hs,y:-hh,z: hs},
        {x:0,y: hh,z:0}
    ]

    const faces=[]

    faces.push(
        {indices:[0,1,2], uvs:[{x:0,y:1},{x:1,y:1},{x:1,y:0}]},
        {indices:[0,2,3], uvs:[{x:0,y:1},{x:1,y:0},{x:0,y:0}]}
    )

    for(let i=0;i<4;i++){
        const a=i
        const b=(i+1)%4
        faces.push({
            indices:[a,b,4],
            uvs:[{x:0,y:1},{x:1,y:1},{x:0.5,y:0}]
        })
    }

    figures.push({center,vs,faces})
}


function add_prism(center, r, h, steps){
    const vs=[]
    for(let i=0;i<steps;i++){
        const a=i/steps*Math.PI*2
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:-h/2})
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:h/2})
    }
    const faces=[]
    for(let i=0;i<steps;i++){
        const a=i*2
        const b=((i+1)%steps)*2
        faces.push([a,b,b+1,a+1])
    }
    figures.push({center, vs, faces: faces.flatMap(triangulate)})
}

function sphereUV(u, v){
    u = (u - 0.25 + 1) % 1
    return { x: u, y: v }
}

function add_sphere(center, r, latSteps=16, lonSteps=32){
    const vs=[]
    const faces=[]

    for(let i=0;i<=latSteps;i++){
        const v=i/latSteps
        const phi=v*Math.PI

        for(let j=0;j<=lonSteps;j++){
            const u=j/lonSteps
            const theta=u*Math.PI*2

            const x=Math.sin(phi)*Math.cos(theta)*r
            const y=Math.cos(phi)*r
            const z=Math.sin(phi)*Math.sin(theta)*r

            vs.push({x,y,z, u, v})
        }
    }

    const row=lonSteps+1
    for(let i=0;i<latSteps;i++){
        for(let j=0;j<lonSteps;j++){
            const a=i*row+j
            const b=a+row

            faces.push({
                indices:[a, b, a+1],
                uvs:[
                    sphereUV(vs[a].u, vs[a].v),
                    sphereUV(vs[b].u, vs[b].v),
                    sphereUV(vs[a+1].u, vs[a+1].v)
                ]
            })

            faces.push({
                indices:[a+1, b, b+1],
                uvs:[
                    sphereUV(vs[a+1].u, vs[a+1].v),
                    sphereUV(vs[b].u, vs[b].v),
                    sphereUV(vs[b+1].u, vs[b+1].v)
                ]
            })
        }
    }

    figures.push({center, vs, faces})
}

function set_texture(figure, imageSrc){
    const img = new Image()
    img.src = imageSrc
    img.onload = ()=> figure.texture = img
}

const keys={}
window.addEventListener("keydown", e=>keys[e.key]=true)
window.addEventListener("keyup", e=>keys[e.key]=false)

let mouseDown=false,lastX=0,lastY=0
game.addEventListener("mousedown", e=>{ mouseDown=true; lastX=e.clientX; lastY=e.clientY })
window.addEventListener("mouseup", ()=>mouseDown=false)
window.addEventListener("mousemove", e=>{
    if(!mouseDown) return
    const dx=e.clientX-lastX, dy=e.clientY-lastY
    lastX=e.clientX; lastY=e.clientY
    camera.yaw-=dx*0.003
    camera.pitch-=dy*0.003
    camera.pitch=Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, camera.pitch))
})

function frame() {
    clear();

    let mv = { x: 0, y: 0, z: 0 };
    const s = 0.05;
    if (keys.w) mv.z += s;
    if (keys.s) mv.z -= s;
    if (keys.a) mv.x -= s;
    if (keys.d) mv.x += s;
    if (keys[" "]) mv.y += s;
    if (keys.Shift) mv.y -= s;

    mv = rotate_yz(mv, camera.pitch);
    mv = rotate_xz(mv, camera.yaw);

    camera.pos.x += mv.x;
    camera.pos.y += mv.y;
    camera.pos.z += mv.z;

    const polys = [];
    for (const f of figures) {
        const verts = f.vs.map(p =>
            to_camera(translate(translate_z(p, 2), f.center))
        );

        for (const face of f.faces) {
            const pts = face.indices.map(i => verts[i])
            if (pts.some(p => p.z <= 0)) continue

            const proj = pts.map(p => screen(project(p)))
            const depth = pts.reduce((a,p)=>a+p.z,0)/3

            polys.push({
                proj,
                depth,
                texture: f.texture,
                uvs: face.uvs
            })
        }
    }

    polys.sort((a, b) => b.depth - a.depth);

    for (const p of polys) draw_polygon(p.proj, p.uvs, p.texture);

    requestAnimationFrame(frame);
}

add_cube({x:-0.7,y:0,z:0},0.5)
const cube = figures[figures.length - 1]
set_texture(cube, "jes.jpg")

add_pyramid({x:0.7,y:0,z:0},0.4,0.5)
const pyramid = figures[figures.length - 1]
set_texture(pyramid, "obama.jpg")

// add_prism({x:0,y:0,z:0},0.25,0.5,16)

add_sphere({x:0,y:0,z:0},0.3,12,20)
const sphere = figures[figures.length - 1]
set_texture(sphere, "saul.jpg")

frame()
