import { Module, forwardRef } from '@nestjs/common';
import { OsmService } from './osm.service';
import { OsmController } from './osm.controller';

@Module({
  imports: [],
  providers: [OsmService],
  controllers: [OsmController],
  exports: [OsmService],
})
export class OsmModule {}
