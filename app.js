const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"
const FILL = "#11aa33"

game.width = 800
game.height = 800

const ctx = game.getContext("2d")

let drawLines = true

document.getElementById("toggleLines").addEventListener("click", ()=>{
    drawLines = !drawLines
})

function clear(){
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, game.width, game.height)
}

function screen(p){
    return {
        x: (p.x + 1) * 0.5 * game.width,
        y: (1 - (p.y + 1) * 0.5) * game.height
    }
}

function project({x, y, z}){
    return { x: x / z, y: y / z, z }
}

function translate({x, y, z}, t){
    return { x: x + t.x, y: y + t.y, z: z + t.z }
}

function translate_z({x, y, z}, dz){
    return { x, y, z: z + dz }
}

function rotate_xz({x, y, z}, a){
    const c = Math.cos(a), s = Math.sin(a)
    return { x: x*c - z*s, y, z: x*s + z*c }
}

function rotate_yz({x, y, z}, a){
    const c = Math.cos(a), s = Math.sin(a)
    return { x, y: y*c - z*s, z: y*s + z*c }
}

const camera = { pos: { x: 0, y: 0, z: -3 }, yaw: 0, pitch: 0 }

function to_camera(p){
    let v = translate(p, { x: -camera.pos.x, y: -camera.pos.y, z: -camera.pos.z })
    v = rotate_xz(v, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return v
}

function draw_polygon(points){
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y)
    ctx.closePath()
    ctx.fillStyle = FILL
    ctx.fill()
    if(drawLines){
        ctx.strokeStyle = FOREGROUND
        ctx.lineWidth = 1
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
    const h = s*0.5
    const vs = [
        {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
        {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
    ]
    const faces = [
        [0,1,2,3],[4,5,6,7],
        [0,1,5,4],[2,3,7,6],
        [1,2,6,5],[3,0,4,7]
    ].flatMap(triangulate)
    figures.push({center, vs, faces})
}

function add_pyramid(center, s, h){
    const hs = s*0.5
    const hh = h*0.5
    const vs = [
        {x:-hs, y:-hh, z:-hs},
        {x: hs, y:-hh, z:-hs},
        {x: hs, y:-hh, z: hs},
        {x:-hs, y:-hh, z: hs},
        {x:0, y:hh, z:0}
    ]
    const faces = [
        [0,1,2,3],
        [0,1,4],
        [1,2,4],
        [2,3,4],
        [3,0,4]
    ].flatMap(triangulate)
    figures.push({center, vs, faces})
}

function add_prism(center, r, h, steps){
    const vs = []
    for(let i=0;i<steps;i++){
        const a=i/steps*Math.PI*2
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:-h/2})
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:h/2})
    }
    const faces = []
    for(let i=0;i<steps;i++){
        const a=i*2
        const b=((i+1)%steps)*2
        faces.push([a,b,b+1,a+1])
    }
    const tris = faces.flatMap(triangulate)
    figures.push({center, vs, faces: tris})
}

function add_sphere(center, r, latSteps=10, lonSteps=16){
    const vs=[]
    const faces=[]
    for(let i=0;i<=latSteps;i++){
        const phi=i/latSteps*Math.PI
        for(let j=0;j<=lonSteps;j++){
            const theta=j/lonSteps*Math.PI*2
            const x=Math.sin(phi)*Math.cos(theta)*r
            const y=Math.cos(phi)*r
            const z=Math.sin(phi)*Math.sin(theta)*r
            vs.push({x,y,z})
        }
    }
    const row=lonSteps+1
    for(let i=0;i<latSteps;i++){
        for(let j=0;j<lonSteps;j++){
            const a=i*row+j
            const b=a+row
            faces.push([a,a+1,b+1,b])
        }
    }
    const tris=faces.flatMap(triangulate)
    figures.push({center, vs, faces: tris})
}

const keys={}
window.addEventListener("keydown", e=>keys[e.key]=true)
window.addEventListener("keyup", e=>keys[e.key]=false)

let mouseDown=false, lastX=0, lastY=0

game.addEventListener("mousedown", e=>{ mouseDown=true; lastX=e.clientX; lastY=e.clientY })
window.addEventListener("mouseup", ()=>mouseDown=false)
window.addEventListener("mousemove", e=>{
    if(!mouseDown) return
    const dx=e.clientX-lastX, dy=e.clientY-lastY
    lastX=e.clientX; lastY=e.clientY
    camera.yaw-=dx*0.003
    camera.pitch-=dy*0.003
    camera.pitch=Math.max(-Math.PI/2+0.01,Math.min(Math.PI/2-0.01,camera.pitch))
})

function frame(){
    clear()
    let mv={x:0,y:0,z:0}
    const s=0.05
    if(keys.w) mv.z+=s
    if(keys.s) mv.z-=s
    if(keys.a) mv.x-=s
    if(keys.d) mv.x+=s
    if(keys[" "]) mv.y+=s
    if(keys.Shift) mv.y-=s
    mv=rotate_yz(mv,camera.pitch)
    mv=rotate_xz(mv,camera.yaw)
    camera.pos.x+=mv.x
    camera.pos.y+=mv.y
    camera.pos.z+=mv.z

    const polys=[]
    for(const f of figures){
        const verts=f.vs.map(p=>to_camera(translate(translate_z(p,2),f.center)))
        for(const face of f.faces){
            const pts=face.map(i=>verts[i])
            if(pts.some(p=>p.z<=0)) continue
            const proj=pts.map(p=>screen(project(p)))
            const depth=pts.reduce((a,p)=>a+p.z,0)/pts.length
            polys.push({proj, depth})
        }
    }
    polys.sort((a,b)=>b.depth-a.depth)
    for(const p of polys) draw_polygon(p.proj)
    requestAnimationFrame(frame)
}

add_cube({x:-0.7,y:0,z:0},0.5)
add_pyramid({x:0.7,y:0,z:0},0.4,0.5)
// add_prism({x:0,y:0,z:0},0.25,0.5,16)
add_sphere({x:0,y:0,z:0},0.3,12,20)

frame()