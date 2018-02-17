# zoning map digitizer

## Steps:
- [x] load PDF file
- [x] isolate a large, highly-saturated section in the middle of the map (zoning map always uses very saturated colors)
- [x] quantize the colors of the map using K-Means clustering
- [x] lump areas of similar color into polygon-shaped patches
- [ ] let the user select which patches are correct, assign a name/label to each one
- [ ] let the user enter in correspondences between points (row, col -> lat, long), use linear regression to find the transformation
- [ ] make a GeoJSON of the colored polygons with the user's labels

## TODO:
- [ ] make the algorithm parameters configurable (I made some `<input>` fields, but they don't do anything)
- [ ] make the blob boundary functions take account of holes inside the polygon
- [ ] allow uploading PNG (or even other image formats) in addition to PDF. (Would also make testing faster, since PDF rendering is very slow, at least with this library)
- [ ] show loading animation on segmentation step
