import * as TOML from 'toml';
import { assert } from 'chai';
import { setup, spawnable } from '../support/acceptance';
import { readFile } from '../support/fs';

describe('neon new', function() {
  setup();

  it('should create a new project', function(done) {
    let self = spawnable(this);
    self.spawn(['new', 'my-app'])
        .wait('This utility will walk you through creating the')
        .wait('version').sendline('')
        .wait('desc').sendline('My new app!')
        .wait('node').sendline('')
        .wait('git').sendline('')
        .wait('author').sendline('')
        .wait('email').sendline('')
        .wait('license').sendline('')
        .sendEof()
        .run(err => {
          if (err) throw err;

          let pkg = JSON.parse(readFile(this.cwd, 'my-app/package.json'));
          assert.propertyVal(pkg, 'name', 'my-app');
          assert.propertyVal(pkg, 'version', '0.1.0');
          assert.propertyVal(pkg, 'description', 'My new app!');
          assert.propertyVal(pkg, 'license', 'MIT');
          assert.nestedProperty(pkg, 'dependencies.neon-cli');

          let cargo = TOML.parse(readFile(this.cwd, 'my-app/native/Cargo.toml'));
          assert.nestedPropertyVal(cargo, 'package.name', 'my-app');
          assert.nestedPropertyVal(cargo, 'package.version', '0.1.0');
          assert.nestedPropertyVal(cargo, 'package.license', 'MIT');
          assert.nestedPropertyVal(cargo, 'lib.name', 'my_app');
          assert.nestedProperty(cargo, 'dependencies.neon');

          let indexjs = readFile(this.cwd, 'my-app/lib/index.js');
          assert.include(indexjs, `require('../native')`);

          let librs = readFile(this.cwd, 'my-app/native/src/lib.rs');
          assert.include(librs, `extern crate neon;`);

          let config = readFile(this.cwd, 'my-app/native/.cargo/config');
          assert.include(config, `[target.'cfg(windows)']`);

          done();
        });
  });

  it('should create a new project as a scoped package', function(done) {
    let self = spawnable(this);
    self.spawn(['new', '@me/my-package'])
        .wait('This utility will walk you through creating the')
        .wait('version').sendline('')
        .wait('desc').sendline('My new scoped package')
        .wait('node').sendline('')
        .wait('git').sendline('')
        .wait('author').sendline('')
        .wait('email').sendline('')
        .wait('license').sendline('')
        .sendEof()
        .run(err => {
          if (err) throw err;

          let pkg = JSON.parse(readFile(this.cwd, 'my-package/package.json'));
          assert.propertyVal(pkg, 'name', '@me/my-package');

          let readme = readFile(this.cwd, 'my-package/README.md');
          assert.match(readme, /@me\/my-package/);

          let cargo = TOML.parse(readFile(this.cwd, 'my-package/native/Cargo.toml'));
          assert.nestedPropertyVal(cargo, 'package.name', 'my-package');
          assert.nestedPropertyVal(cargo, 'lib.name', 'my_package');

          done();
        });
  });

  it('should escape quotes in the generated package.json and Cargo.toml', function(done) {
    let self = spawnable(this);
    self.spawn(['new', 'my-app'])
        .wait('This utility will walk you through creating the')
        .wait('version').sendline('')
        .wait('desc').sendline('Foo "bar"')
        .wait('node').sendline('')
        .wait('git').sendline('http://www.example.com/foo.git?bar="baz"')
        .wait('author').sendline('Foo "Bar" Baz')
        .wait('email').sendline('hughjass@example.com')
        .wait('license').sendline('')
        .sendEof()
        .run(err => {
          if (err) throw err;

          let pkg = JSON.parse(readFile(this.cwd, 'my-app/package.json'));
          assert.propertyVal(pkg, 'description', 'Foo "bar"');
          assert.nestedPropertyVal(pkg, 'repository.url', 'http://www.example.com/foo.git?bar=%22baz%22');
          assert.propertyVal(pkg, 'author', 'Foo "Bar" Baz <hughjass@example.com>');

          let cargo = TOML.parse(readFile(this.cwd, 'my-app/native/Cargo.toml'));
          assert.includeDeepMembers(cargo.package.authors, ['Foo "Bar" Baz <hughjass@example.com>'])

          done();
        });
  });
});
