import { Module, forwardRef } from '@nestjs/common';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { OsmModule } from '../osm/osm.module';

@Module({
  imports: [forwardRef(() => OsmModule)],
  providers: [RouteService],
  controllers: [RouteController],
  exports: [RouteService],
})
export class RouteModule {}
