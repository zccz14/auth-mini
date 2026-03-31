#!/usr/bin/env node

import { cac } from 'cac'

const cli = cac('mini-auth')

cli.version('0.1.0')
cli.help()
cli.parse()
