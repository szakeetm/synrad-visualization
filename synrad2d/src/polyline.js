// Iterative Ramer–Douglas–Peucker in CSS pixels. The caller reuses the buffers.
// Distance is to the finite segment, so folds and coincident endpoints survive.
export function simplifyPolyline(x, y, count, tolerance, keep, stack) {
  keep.fill(0,0,count);
  if (!count) return;
  keep[0]=keep[count-1]=1;
  let top=0;
  stack[top++]=0;stack[top++]=count-1;
  while(top) {
    const end=stack[--top],start=stack[--top];
    const ax=x[start],ay=y[start],dx=x[end]-ax,dy=y[end]-ay;
    const length2=dx*dx+dy*dy;
    let maximum=tolerance*tolerance,split=-1;
    for(let i=start+1;i<end;i++) {
      const px=x[i]-ax,py=y[i]-ay;
      const t=length2?Math.max(0,Math.min(1,(px*dx+py*dy)/length2)):0;
      const ex=px-t*dx,ey=py-t*dy,distance2=ex*ex+ey*ey;
      if(distance2>maximum){maximum=distance2;split=i;}
    }
    if(split!==-1) {
      keep[split]=1;
      stack[top++]=start;stack[top++]=split;
      stack[top++]=split;stack[top++]=end;
    }
  }
}
