# zoning map digitizer

## Steps:
- [x] load PDF file
- [x] isolate a large, highly-saturated section in the middle of the map (zoning map always uses very saturated colors)
- [x] quantize the colors of the map using K-Means clustering
- [x] lump areas of similar color into polygon-shaped patches
- [ ] let the user select which patches are correct, assign a name/label to each one
- [x] let the user enter in correspondences between points (row, col -> lat, long), use linear regression to find the transformation
- [ ] make a GeoJSON of the colored polygons with the user's labels

## TODO:
- [x] make the algorithm parameters configurable (I made some `<input>` fields, but they don't do anything)
- [ ] make the blob boundary functions take account of holes inside the polygon
- [ ] allow uploading PNG (or even other image formats) in addition to PDF. (Would also make testing faster, since PDF rendering is very slow, at least with this library)
- [ ] show loading animation on segmentation step

Stuff to speed up the testing/development of program:
- [ ] Persistent storage (localStorage) of app state, so that you can reload it and not have to re-do steps (or maybe 5-10MB is not enough to store the state??)
- [ ] Download state of app into a file (and be able to restore from state), so that you can go mess with it later

UI stuff:
- [ ] Sort polygons in decreasing area order (and show the area, in acres or sq mi, in the list)
- [ ] make way to enter in name of zone
- [ ] make fast way of entering same zone for things of same color
