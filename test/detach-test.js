'use strict';

const { describe, it } = require('./helpers/mocha');
const { expect } = require('./helpers/chai');
const path = require('path');
const detach = require('../src/detach');
const { createTmpDir } = require('./helpers/tmp');
const fixturify = require('fixturify');
const stringifyJson = require('../src/json').stringify;
const inquirer = require('inquirer');
const sinon = require('sinon');
const { gitInit } = require('git-fixtures');

const defaultWorkspace = {
  'packages': {
    'package-a': {
      'package.json': stringifyJson({
        'name': '@scope/package-a',
        'version': '1.0.0',
        'devDependencies': {
          '@scope/package-b': '^2.0.0',
          '@scope/package-c': '^1.0.0',
        },
      }),
    },
    'package-b': {
      'package.json': stringifyJson({
        'name': '@scope/package-b',
        'version': '2.0.0',
        'dependencies': {
          '@scope/package-a': '^1.0.0',
        },
      }),
    },
    'package-c': {
      'package.json': stringifyJson({
        'name': '@scope/package-c',
        'version': '3.0.0',
        'dependencies': {
          '@scope/package-b': '^2.0.0',
        },
        'devDependencies': {
          '@scope/package-a': '^1.0.0',
        },
      }),
    },
  },
  'package.json': stringifyJson({
    'workspaces': [
      'packages/*',
    ],
    'devDependencies': {
      '@scope/package-a': '^1.0.0',
      '@scope/package-b': '^1.0.0',
    },
  }),
};

describe(detach, function() {
  let tmpPath;
  let prompt;

  beforeEach(async function() {
    tmpPath = await createTmpDir();

    prompt = sinon.stub(inquirer, 'prompt');

    await gitInit({ cwd: tmpPath });

    fixturify.writeSync(tmpPath, defaultWorkspace);
  });

  afterEach(function() {
    sinon.restore();
  });

  it('package-a', async function() {
    let cwd = path.resolve(tmpPath, './packages/package-a');

    prompt.withArgs([sinon.match({
      choices: [
        '@scope/package-b',
        '@scope/package-c',
        'Workspace Root',
      ],
    })]).resolves({
      answers: [
        '@scope/package-b',
        'Workspace Root',
      ],
    });

    await detach({ cwd });

    let workspace = fixturify.readSync(tmpPath, { exclude: ['.git'] });

    expect(prompt).to.be.calledOnce;

    expect(workspace).to.deep.equal({
      'packages': {
        'package-a': {
          'package.json': stringifyJson({
            'name': '@scope/package-a',
            'version': '1.0.0-detached',
            'devDependencies': {
              '@scope/package-b': '^2.0.0',
              '@scope/package-c': '^1.0.0',
            },
          }),
        },
        'package-b': {
          'package.json': stringifyJson({
            'name': '@scope/package-b',
            'version': '2.0.0',
            'dependencies': {
              '@scope/package-a': '^1.0.0 || 1.0.0-detached',
            },
          }),
        },
        'package-c': {
          'package.json': stringifyJson({
            'name': '@scope/package-c',
            'version': '3.0.0',
            'dependencies': {
              '@scope/package-b': '^2.0.0',
            },
            'devDependencies': {
              '@scope/package-a': '^1.0.0',
            },
          }),
        },
      },
      'package.json': stringifyJson({
        'workspaces': [
          'packages/*',
        ],
        'devDependencies': {
          '@scope/package-a': '^1.0.0 || 1.0.0-detached',
          '@scope/package-b': '^1.0.0',
        },
      }),
    });
  });

  it('package-b', async function() {
    let cwd = path.resolve(tmpPath, './packages/package-b');

    prompt.withArgs([sinon.match({
      choices: [
        '@scope/package-a',
        '@scope/package-c',
      ],
    })]).resolves({
      answers: [
        '@scope/package-a',
        '@scope/package-c',
      ],
    });

    await detach({ cwd });

    let workspace = fixturify.readSync(tmpPath, { exclude: ['.git'] });

    expect(prompt).to.be.calledOnce;

    expect(workspace).to.deep.equal({
      'packages': {
        'package-a': {
          'package.json': stringifyJson({
            'name': '@scope/package-a',
            'version': '1.0.0',
            'devDependencies': {
              '@scope/package-b': '^2.0.0 || 2.0.0-detached',
              '@scope/package-c': '^1.0.0',
            },
          }),
        },
        'package-b': {
          'package.json': stringifyJson({
            'name': '@scope/package-b',
            'version': '2.0.0-detached',
            'dependencies': {
              '@scope/package-a': '^1.0.0',
            },
          }),
        },
        'package-c': {
          'package.json': stringifyJson({
            'name': '@scope/package-c',
            'version': '3.0.0',
            'dependencies': {
              '@scope/package-b': '^2.0.0 || 2.0.0-detached',
            },
            'devDependencies': {
              '@scope/package-a': '^1.0.0',
            },
          }),
        },
      },
      'package.json': stringifyJson({
        'workspaces': [
          'packages/*',
        ],
        'devDependencies': {
          '@scope/package-a': '^1.0.0',
          '@scope/package-b': '^1.0.0',
        },
      }),
    });
  });

  it('package-c', async function() {
    let cwd = path.resolve(tmpPath, './packages/package-c');

    await detach({ cwd });

    let workspace = fixturify.readSync(tmpPath, { exclude: ['.git'] });

    expect(prompt).to.not.be.called;

    expect(workspace).to.deep.equal({
      'packages': {
        'package-a': {
          'package.json': stringifyJson({
            'name': '@scope/package-a',
            'version': '1.0.0',
            'devDependencies': {
              '@scope/package-b': '^2.0.0',
              '@scope/package-c': '^1.0.0',
            },
          }),
        },
        'package-b': {
          'package.json': stringifyJson({
            'name': '@scope/package-b',
            'version': '2.0.0',
            'dependencies': {
              '@scope/package-a': '^1.0.0',
            },
          }),
        },
        'package-c': {
          'package.json': stringifyJson({
            'name': '@scope/package-c',
            'version': '3.0.0-detached',
            'dependencies': {
              '@scope/package-b': '^2.0.0',
            },
            'devDependencies': {
              '@scope/package-a': '^1.0.0',
            },
          }),
        },
      },
      'package.json': stringifyJson({
        'workspaces': [
          'packages/*',
        ],
        'devDependencies': {
          '@scope/package-a': '^1.0.0',
          '@scope/package-b': '^1.0.0',
        },
      }),
    });
  });
});
